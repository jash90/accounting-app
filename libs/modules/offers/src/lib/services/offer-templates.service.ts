import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Brackets, DataSource, Repository } from 'typeorm';

import {
  createPaginatedResponse,
  isForeignKeyViolation,
  OfferTemplate,
  User,
  type PaginatedResponseDto,
} from '@accounting/common';
import { SystemCompanyService } from '@accounting/common/backend';
import { StorageService } from '@accounting/infrastructure/storage';

import { UpdateContentBlocksDto } from '../dto/content-blocks.dto';
import { StandardPlaceholdersResponseDto } from '../dto/offer-response.dto';
import {
  CreateOfferTemplateDto,
  OfferTemplateFiltersDto,
  UpdateOfferTemplateDto,
} from '../dto/offer-template.dto';
import {
  OfferTemplateHasOffersException,
  OfferTemplateInvalidFileTypeException,
  OfferTemplateNotFoundException,
} from '../exceptions/offer.exception';

// Standard placeholders available for all offers
const STANDARD_PLACEHOLDERS = [
  { key: 'nazwa', label: 'Nazwa firmy', description: 'Nazwa firmy odbiorcy' },
  { key: 'nip', label: 'NIP', description: 'Numer NIP odbiorcy' },
  { key: 'regon', label: 'REGON', description: 'Numer REGON odbiorcy' },
  { key: 'adres', label: 'Adres', description: 'Pełny adres (ulica, kod pocztowy, miasto)' },
  { key: 'ulica', label: 'Ulica', description: 'Ulica odbiorcy' },
  { key: 'kod_pocztowy', label: 'Kod pocztowy', description: 'Kod pocztowy odbiorcy' },
  { key: 'miasto', label: 'Miasto', description: 'Miasto odbiorcy' },
  { key: 'kraj', label: 'Kraj', description: 'Kraj odbiorcy' },
  {
    key: 'osoba_kontaktowa',
    label: 'Osoba kontaktowa',
    description: 'Imię i nazwisko osoby kontaktowej',
  },
  { key: 'stanowisko', label: 'Stanowisko', description: 'Stanowisko osoby kontaktowej' },
  { key: 'email', label: 'Email', description: 'Adres email odbiorcy' },
  { key: 'telefon', label: 'Telefon', description: 'Numer telefonu odbiorcy' },
  {
    key: 'numer_oferty',
    label: 'Numer oferty',
    description: 'Unikalny numer oferty (np. OF/2026/001)',
  },
  { key: 'data_oferty', label: 'Data oferty', description: 'Data wystawienia oferty' },
  { key: 'wazna_do', label: 'Ważna do', description: 'Data ważności oferty' },
  { key: 'cena_netto', label: 'Cena netto', description: 'Łączna cena netto' },
  { key: 'stawka_vat', label: 'Stawka VAT', description: 'Stawka VAT (%)' },
  { key: 'cena_brutto', label: 'Cena brutto', description: 'Łączna cena brutto' },
  { key: 'kwota_vat', label: 'Kwota VAT', description: 'Kwota podatku VAT' },
];

@Injectable()
export class OfferTemplatesService {
  constructor(
    @InjectRepository(OfferTemplate)
    private readonly templateRepository: Repository<OfferTemplate>,
    private readonly systemCompanyService: SystemCompanyService,
    private readonly storageService: StorageService,
    private readonly dataSource: DataSource
  ) {}

  private async getCompanyId(user: User): Promise<string> {
    return this.systemCompanyService.getCompanyIdForUser(user);
  }

  private escapeLikePattern(pattern: string): string {
    return pattern.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
  }

  async findAll(
    user: User,
    filters: OfferTemplateFiltersDto
  ): Promise<PaginatedResponseDto<OfferTemplate>> {
    const companyId = await this.getCompanyId(user);
    const { page = 1, limit = 20, search, isActive } = filters;

    const query = this.templateRepository
      .createQueryBuilder('template')
      .where('template.companyId = :companyId', { companyId });

    if (search) {
      const escapedSearch = `%${this.escapeLikePattern(search)}%`;
      query.andWhere(
        new Brackets((qb) => {
          qb.where('template.name ILIKE :search', { search: escapedSearch }).orWhere(
            'template.description ILIKE :search',
            { search: escapedSearch }
          );
        })
      );
    }

    if (isActive !== undefined) {
      query.andWhere('template.isActive = :isActive', { isActive });
    }

    query.orderBy('template.isDefault', 'DESC').addOrderBy('template.name', 'ASC');

    const [data, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return createPaginatedResponse(data, total, page, limit);
  }

  async findOne(id: string, user: User): Promise<OfferTemplate> {
    const companyId = await this.getCompanyId(user);

    const template = await this.templateRepository.findOne({
      where: { id, companyId },
    });

    if (!template) {
      throw new OfferTemplateNotFoundException(id);
    }

    return template;
  }

  async findDefault(user: User): Promise<OfferTemplate | null> {
    const companyId = await this.getCompanyId(user);

    return this.templateRepository.findOne({
      where: { companyId, isDefault: true, isActive: true },
    });
  }

  async create(dto: CreateOfferTemplateDto, user: User): Promise<OfferTemplate> {
    const companyId = await this.getCompanyId(user);

    return this.dataSource.transaction(async (manager) => {
      const templateRepo = manager.getRepository(OfferTemplate);

      // If this is set as default, unset other defaults atomically
      if (dto.isDefault) {
        await templateRepo.update({ companyId, isDefault: true }, { isDefault: false });
      }

      const template = templateRepo.create({
        ...dto,
        companyId,
        createdById: user.id,
      });

      return templateRepo.save(template);
    });
  }

  async update(id: string, dto: UpdateOfferTemplateDto, user: User): Promise<OfferTemplate> {
    const template = await this.findOne(id, user);
    const companyId = await this.getCompanyId(user);

    return this.dataSource.transaction(async (manager) => {
      const templateRepo = manager.getRepository(OfferTemplate);

      // If this is set as default, unset other defaults atomically
      if (dto.isDefault && !template.isDefault) {
        await templateRepo.update({ companyId, isDefault: true }, { isDefault: false });
      }

      // Explicit field assignment to prevent overwriting protected fields (e.g. companyId, id)
      if (dto.name !== undefined) template.name = dto.name;
      if (dto.description !== undefined) template.description = dto.description;
      if (dto.availablePlaceholders !== undefined)
        template.availablePlaceholders = dto.availablePlaceholders;
      if (dto.defaultServiceItems !== undefined)
        template.defaultServiceItems = dto.defaultServiceItems;
      if (dto.defaultValidityDays !== undefined)
        template.defaultValidityDays = dto.defaultValidityDays;
      if (dto.defaultVatRate !== undefined) template.defaultVatRate = dto.defaultVatRate;
      if (dto.isDefault !== undefined) template.isDefault = dto.isDefault;
      if (dto.isActive !== undefined) template.isActive = dto.isActive;
      template.updatedById = user.id;

      return templateRepo.save(template);
    });
  }

  async remove(id: string, user: User): Promise<void> {
    const template = await this.findOne(id, user);

    // Delete the file from storage if it exists
    if (template.templateFilePath) {
      try {
        await this.storageService.deleteFile(template.templateFilePath);
      } catch {
        // Ignore file deletion errors
      }
    }

    try {
      await this.templateRepository.remove(template);
    } catch (error: unknown) {
      if (isForeignKeyViolation(error)) {
        throw new OfferTemplateHasOffersException(id);
      }
      throw error;
    }
  }

  async uploadTemplateFile(
    id: string,
    file: Express.Multer.File,
    user: User
  ): Promise<OfferTemplate> {
    const template = await this.findOne(id, user);

    // Validate file type - only .docx is supported by docxtemplater
    const allowedMimeTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new OfferTemplateInvalidFileTypeException();
    }

    // Delete old file if exists
    if (template.templateFilePath) {
      try {
        await this.storageService.deleteFile(template.templateFilePath);
      } catch {
        // Ignore deletion errors
      }
    }

    // Upload new file
    const filePath = `offer-templates/${template.companyId}/${template.id}`;
    await this.storageService.uploadFile(file, filePath);

    template.templateFilePath = filePath;
    template.templateFileName = file.originalname;
    template.updatedById = user.id;

    return this.templateRepository.save(template);
  }

  async downloadTemplateFile(
    id: string,
    user: User
  ): Promise<{ buffer: Buffer; fileName: string }> {
    const template = await this.findOne(id, user);

    if (!template.templateFilePath) {
      throw new OfferTemplateNotFoundException(id);
    }

    const buffer = await this.storageService.downloadFile(template.templateFilePath);
    return {
      buffer,
      fileName: template.templateFileName || 'template.docx',
    };
  }

  async getContentBlocks(
    id: string,
    user: User
  ): Promise<{
    contentBlocks: OfferTemplate['contentBlocks'];
    documentSourceType: OfferTemplate['documentSourceType'];
    name: string;
  }> {
    const template = await this.findOne(id, user);
    return {
      contentBlocks: template.contentBlocks,
      documentSourceType: template.documentSourceType,
      name: template.name,
    };
  }

  async updateContentBlocks(
    id: string,
    dto: UpdateContentBlocksDto,
    user: User
  ): Promise<OfferTemplate> {
    const template = await this.findOne(id, user);

    if (dto.contentBlocks !== undefined) {
      template.contentBlocks = dto.contentBlocks;
    }
    if (dto.documentSourceType !== undefined) {
      template.documentSourceType = dto.documentSourceType;
    }
    template.updatedById = user.id;

    return this.templateRepository.save(template);
  }

  getStandardPlaceholders(): StandardPlaceholdersResponseDto {
    return { placeholders: STANDARD_PLACEHOLDERS };
  }
}
