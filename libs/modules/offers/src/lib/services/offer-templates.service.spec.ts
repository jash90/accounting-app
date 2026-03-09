import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { DataSource, type Repository } from 'typeorm';

import { OfferTemplate, type User } from '@accounting/common';
import { SystemCompanyService } from '@accounting/common/backend';

import { OfferTemplatesService } from './offer-templates.service';
import {
  OfferTemplateHasOffersException,
  OfferTemplateInvalidFileTypeException,
  OfferTemplateNotFoundException,
} from '../exceptions/offer.exception';

function createMockQueryBuilder() {
  const qb: Record<string, jest.Mock> = {};
  const chainable = [
    'createQueryBuilder',
    'where',
    'andWhere',
    'orderBy',
    'addOrderBy',
    'skip',
    'take',
  ];
  chainable.forEach((method) => {
    qb[method] = jest.fn().mockReturnValue(qb);
  });
  qb['getManyAndCount'] = jest.fn().mockResolvedValue([[], 0]);
  return qb;
}

describe('OfferTemplatesService', () => {
  let service: OfferTemplatesService;
  let templateRepository: jest.Mocked<Repository<OfferTemplate>>;
  let systemCompanyService: jest.Mocked<Pick<SystemCompanyService, 'getCompanyIdForUser'>>;
  let storageService: Record<string, jest.Mock>;
  let dataSource: jest.Mocked<Pick<DataSource, 'transaction'>>;

  const companyId = 'company-1';
  const mockUser = { id: 'user-1', companyId, role: 'EMPLOYEE' } as User;

  let mockQb: ReturnType<typeof createMockQueryBuilder>;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockQb = createMockQueryBuilder();

    templateRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQb),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    } as unknown as jest.Mocked<Repository<OfferTemplate>>;

    systemCompanyService = {
      getCompanyIdForUser: jest.fn().mockResolvedValue(companyId),
    };

    storageService = {
      uploadFile: jest.fn().mockResolvedValue(undefined),
      downloadFile: jest.fn().mockResolvedValue(Buffer.from('docx content')),
      deleteFile: jest.fn().mockResolvedValue(undefined),
    };

    const mockTemplateRepo = {
      update: jest.fn().mockResolvedValue(undefined),
      create: jest.fn().mockReturnValue({ id: 'new-tpl' }),
      save: jest.fn().mockImplementation((data: unknown) =>
        Promise.resolve({ ...(data as object), id: 'new-tpl' })
      ),
    };

    dataSource = {
      transaction: jest.fn().mockImplementation((cb: (manager: unknown) => unknown) => {
        const manager = {
          getRepository: jest.fn().mockReturnValue(mockTemplateRepo),
        };
        return cb(manager);
      }),
    };

    const module = await Test.createTestingModule({
      providers: [
        {
          provide: OfferTemplatesService,
          useFactory: () =>
            new OfferTemplatesService(
              templateRepository as any,
              systemCompanyService as any,
              storageService as any,
              dataSource as any
            ),
        },
        { provide: getRepositoryToken(OfferTemplate), useValue: templateRepository },
        { provide: SystemCompanyService, useValue: systemCompanyService },
        { provide: 'StorageService', useValue: storageService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(OfferTemplatesService);
  });

  describe('findAll', () => {
    it('should return paginated templates scoped to company', async () => {
      const templates = [{ id: 'tpl-1', name: 'Template A' }] as OfferTemplate[];
      mockQb['getManyAndCount'].mockResolvedValue([templates, 1]);

      const result = await service.findAll(mockUser, { page: 1, limit: 10 } as any);

      expect(mockQb['where']).toHaveBeenCalledWith('template.companyId = :companyId', {
        companyId,
      });
      expect(result.data).toEqual(templates);
      expect(result.meta.total).toBe(1);
    });

    it('should apply search filter on name and description', async () => {
      mockQb['getManyAndCount'].mockResolvedValue([[], 0]);

      await service.findAll(mockUser, { page: 1, limit: 10, search: 'test' } as any);

      expect(mockQb['andWhere']).toHaveBeenCalled();
    });

    it('should apply isActive filter', async () => {
      mockQb['getManyAndCount'].mockResolvedValue([[], 0]);

      await service.findAll(mockUser, { page: 1, limit: 10, isActive: true } as any);

      expect(mockQb['andWhere']).toHaveBeenCalledWith('template.isActive = :isActive', {
        isActive: true,
      });
    });

    it('should order by isDefault DESC then name ASC', async () => {
      mockQb['getManyAndCount'].mockResolvedValue([[], 0]);

      await service.findAll(mockUser, { page: 1, limit: 10 } as any);

      expect(mockQb['orderBy']).toHaveBeenCalledWith('template.isDefault', 'DESC');
      expect(mockQb['addOrderBy']).toHaveBeenCalledWith('template.name', 'ASC');
    });
  });

  describe('findOne', () => {
    it('should return template when found', async () => {
      const template = { id: 'tpl-1', companyId } as OfferTemplate;
      templateRepository.findOne.mockResolvedValue(template);

      const result = await service.findOne('tpl-1', mockUser);

      expect(result).toEqual(template);
    });

    it('should throw OfferTemplateNotFoundException when not found', async () => {
      templateRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('bad-id', mockUser)).rejects.toThrow(
        OfferTemplateNotFoundException
      );
    });
  });

  describe('findDefault', () => {
    it('should return default active template', async () => {
      const template = { id: 'tpl-1', isDefault: true, isActive: true } as OfferTemplate;
      templateRepository.findOne.mockResolvedValue(template);

      const result = await service.findDefault(mockUser);

      expect(templateRepository.findOne).toHaveBeenCalledWith({
        where: { companyId, isDefault: true, isActive: true },
      });
      expect(result).toEqual(template);
    });
  });

  describe('create', () => {
    it('should create template with correct companyId', async () => {
      const dto = { name: 'New Template', isDefault: false } as any;

      const result = await service.create(dto, mockUser);

      expect(dataSource.transaction).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('remove', () => {
    it('should delete template and associated file', async () => {
      const template = {
        id: 'tpl-1',
        companyId,
        templateFilePath: 'offer-templates/company-1/tpl-1',
      } as OfferTemplate;
      templateRepository.findOne.mockResolvedValue(template);
      templateRepository.remove.mockResolvedValue(template);

      await service.remove('tpl-1', mockUser);

      expect(storageService.deleteFile).toHaveBeenCalledWith(template.templateFilePath);
      expect(templateRepository.remove).toHaveBeenCalledWith(template);
    });

    it('should throw OfferTemplateHasOffersException on FK violation', async () => {
      const template = { id: 'tpl-1', companyId, templateFilePath: null } as unknown as OfferTemplate;
      templateRepository.findOne.mockResolvedValue(template);

      const fkError = new Error('FK violation');
      (fkError as any).code = '23503';
      templateRepository.remove.mockRejectedValue(fkError);

      await expect(service.remove('tpl-1', mockUser)).rejects.toThrow(
        OfferTemplateHasOffersException
      );
    });

    it('should ignore file deletion errors gracefully', async () => {
      const template = {
        id: 'tpl-1',
        companyId,
        templateFilePath: 'some/path',
      } as OfferTemplate;
      templateRepository.findOne.mockResolvedValue(template);
      storageService.deleteFile.mockRejectedValue(new Error('S3 error'));
      templateRepository.remove.mockResolvedValue(template);

      await expect(service.remove('tpl-1', mockUser)).resolves.toBeUndefined();
    });
  });

  describe('uploadTemplateFile', () => {
    it('should reject non-DOCX files', async () => {
      const template = { id: 'tpl-1', companyId } as OfferTemplate;
      templateRepository.findOne.mockResolvedValue(template);

      const file = { mimetype: 'application/pdf', originalname: 'test.pdf' } as Express.Multer.File;

      await expect(service.uploadTemplateFile('tpl-1', file, mockUser)).rejects.toThrow(
        OfferTemplateInvalidFileTypeException
      );
    });
  });

  describe('getStandardPlaceholders', () => {
    it('should return array of placeholders with key, label, description', () => {
      const result = service.getStandardPlaceholders();

      expect(result.placeholders).toBeInstanceOf(Array);
      expect(result.placeholders.length).toBeGreaterThan(0);
      expect(result.placeholders[0]).toHaveProperty('key');
      expect(result.placeholders[0]).toHaveProperty('label');
      expect(result.placeholders[0]).toHaveProperty('description');
    });
  });
});
