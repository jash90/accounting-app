import { BadRequestException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';

import {
  EmploymentType,
  TaxScheme,
  UserRole,
  VatStatus,
  ZusStatus,
  type Client,
  type User,
} from '@accounting/common';

import { ClientExportService } from './export.service';

describe('ClientExportService', () => {
  let service: ClientExportService;

  const mockCompanyId = 'company-123';
  const mockUserId = 'user-123';

  const mockUser: Partial<User> = {
    id: mockUserId,
    email: 'test@example.com',
    role: UserRole.COMPANY_OWNER,
    companyId: mockCompanyId,
  };

  const mockClient: Partial<Client> = {
    id: 'client-1',
    name: 'Test Client',
    nip: '1234567890',
    email: 'client@test.com',
    phone: '+48123456789',
    companyId: mockCompanyId,
    employmentType: EmploymentType.DG,
    vatStatus: VatStatus.VAT_MONTHLY,
    taxScheme: TaxScheme.GENERAL,
    zusStatus: ZusStatus.FULL,
    companySpecificity: 'specifics',
    additionalInfo: 'info',
    isActive: true,
  };

  const mockSystemCompanyService = {
    getCompanyIdForUser: jest.fn(),
  };

  const mockChangeLogService = {
    logCreate: jest.fn(),
    logUpdate: jest.fn(),
    logDelete: jest.fn(),
  };

  const createMockQueryBuilder = () => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([mockClient]),
  });

  const mockClientRepo = {
    createQueryBuilder: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockDataSource = {
    transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockSystemCompanyService.getCompanyIdForUser.mockResolvedValue(mockCompanyId);
    mockClientRepo.createQueryBuilder.mockReturnValue(createMockQueryBuilder());

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ClientExportService,
          useFactory: () => {
            return new ClientExportService(
              mockClientRepo as any,
              mockChangeLogService as any,
              mockSystemCompanyService as any,
              mockDataSource as any
            );
          },
        },
      ],
    }).compile();

    service = module.get<ClientExportService>(ClientExportService);
  });

  describe('exportToCsv', () => {
    it('should export clients as CSV buffer', async () => {
      const result = await service.exportToCsv({}, mockUser as User);

      expect(result).toBeInstanceOf(Buffer);
      const csv = result.toString('utf-8');
      expect(csv).toContain('name');
      expect(csv).toContain('nip');
      expect(csv).toContain('Test Client');
    });

    it('should include all column headers', async () => {
      const result = await service.exportToCsv({}, mockUser as User);
      const csv = result.toString('utf-8');
      const headers = csv.split('\n')[0];

      expect(headers).toContain('name');
      expect(headers).toContain('nip');
      expect(headers).toContain('email');
      expect(headers).toContain('phone');
      expect(headers).toContain('employmentType');
      expect(headers).toContain('vatStatus');
      expect(headers).toContain('taxScheme');
      expect(headers).toContain('zusStatus');
      expect(headers).toContain('companySpecificity');
      expect(headers).toContain('additionalInfo');
      expect(headers).toContain('isActive');
    });

    it('should apply employmentType filter', async () => {
      const qb = createMockQueryBuilder();
      mockClientRepo.createQueryBuilder.mockReturnValue(qb);

      await service.exportToCsv({ employmentType: EmploymentType.DG }, mockUser as User);

      expect(qb.andWhere).toHaveBeenCalledWith('client.employmentType = :employmentType', {
        employmentType: EmploymentType.DG,
      });
    });

    it('should apply vatStatus filter', async () => {
      const qb = createMockQueryBuilder();
      mockClientRepo.createQueryBuilder.mockReturnValue(qb);

      await service.exportToCsv({ vatStatus: VatStatus.VAT_MONTHLY }, mockUser as User);

      expect(qb.andWhere).toHaveBeenCalledWith('client.vatStatus = :vatStatus', {
        vatStatus: VatStatus.VAT_MONTHLY,
      });
    });

    it('should apply search filter with ILIKE', async () => {
      const qb = createMockQueryBuilder();
      mockClientRepo.createQueryBuilder.mockReturnValue(qb);

      await service.exportToCsv({ search: 'test' }, mockUser as User);

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        expect.objectContaining({ search: '%test%' })
      );
    });

    it('should apply isActive filter', async () => {
      const qb = createMockQueryBuilder();
      mockClientRepo.createQueryBuilder.mockReturnValue(qb);

      await service.exportToCsv({ isActive: true } as any, mockUser as User);

      expect(qb.andWhere).toHaveBeenCalledWith('client.isActive = :isActive', {
        isActive: true,
      });
    });

    it('should return empty data rows for no clients', async () => {
      const qb = createMockQueryBuilder();
      qb.getMany.mockResolvedValue([]);
      mockClientRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.exportToCsv({}, mockUser as User);
      const csv = result.toString('utf-8');
      const lines = csv.split('\n').filter((l: string) => l.trim());

      expect(lines).toHaveLength(1); // headers only
    });

    it('should handle clients with special characters in fields', async () => {
      const clientWithSpecial = {
        ...mockClient,
        name: 'Firma "Nowak & Syn", sp. z o.o.',
        additionalInfo: 'Line1\nLine2',
      };
      const qb = createMockQueryBuilder();
      qb.getMany.mockResolvedValue([clientWithSpecial]);
      mockClientRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.exportToCsv({}, mockUser as User);
      const csv = result.toString('utf-8');

      // CSV should properly escape fields with commas and quotes
      expect(csv).toContain('"');
    });

    it('should handle clients with null optional fields', async () => {
      const clientMinimal = {
        ...mockClient,
        nip: null,
        email: null,
        phone: null,
        employmentType: null,
        vatStatus: null,
        taxScheme: null,
        zusStatus: null,
        companySpecificity: null,
        additionalInfo: null,
      };
      const qb = createMockQueryBuilder();
      qb.getMany.mockResolvedValue([clientMinimal]);
      mockClientRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.exportToCsv({}, mockUser as User);

      expect(result).toBeInstanceOf(Buffer);
      const csv = result.toString('utf-8');
      expect(csv).toContain('Test Client');
    });
  });

  describe('generateCsvImportTemplate', () => {
    it('should return a Buffer with headers and example row', () => {
      const result = service.generateCsvImportTemplate();

      expect(result).toBeInstanceOf(Buffer);
      const csv = result.toString('utf-8');
      const lines = csv.split('\n');

      expect(lines.length).toBeGreaterThanOrEqual(2);
      expect(lines[0]).toContain('name');
      expect(lines[0]).toContain('nip');
      expect(lines[1]).toContain('1234567890');
    });
  });

  describe('importFromCsv', () => {
    it('should throw BadRequestException for CSV with only headers', async () => {
      await expect(service.importFromCsv('name,nip,email', mockUser as User)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException for missing required name header', async () => {
      const csv = 'nip,email\n1234567890,test@test.com';

      await expect(service.importFromCsv(csv, mockUser as User)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should return validation errors for invalid rows', async () => {
      const csv = 'name,nip,email\nA,invalid_nip,bad-email';

      const result = await service.importFromCsv(csv, mockUser as User);

      expect(result.imported).toBe(0);
      expect(result.updated).toBe(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate NIP format (10 digits required)', async () => {
      const csv = 'name,nip\nGood Name,123';

      const result = await service.importFromCsv(csv, mockUser as User);

      expect(result.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'nip' })])
      );
    });

    it('should validate employment type enum', async () => {
      const csv = 'name,employmentType\nGood Name,INVALID_TYPE';

      const result = await service.importFromCsv(csv, mockUser as User);

      expect(result.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'employmentType' })])
      );
    });

    it('should import new clients in transaction', async () => {
      const csv = 'name,nip\nNew Client,1234567890';
      const mockManager = {
        getRepository: jest.fn().mockReturnValue({
          findOne: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockReturnValue({ id: 'new-1', name: 'New Client' }),
          save: jest.fn().mockResolvedValue({ id: 'new-1', name: 'New Client' }),
        }),
      };
      mockDataSource.transaction.mockImplementation(async (cb: any) => cb(mockManager));

      const result = await service.importFromCsv(csv, mockUser as User);

      expect(result.imported).toBe(1);
      expect(result.updated).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should update existing clients matched by NIP', async () => {
      const csv = 'name,nip\nUpdated Name,1234567890';
      const existingClient = { ...mockClient, id: 'existing-1' };
      const mockManager = {
        getRepository: jest.fn().mockReturnValue({
          findOne: jest.fn().mockResolvedValue(existingClient),
          save: jest.fn().mockResolvedValue({ ...existingClient, name: 'Updated Name' }),
        }),
      };
      mockDataSource.transaction.mockImplementation(async (cb: any) => cb(mockManager));

      const result = await service.importFromCsv(csv, mockUser as User);

      expect(result.imported).toBe(0);
      expect(result.updated).toBe(1);
    });

    it('should return validation errors for rows with wrong column count', async () => {
      const csv = 'name,nip,email\nOnly One Column';

      const result = await service.importFromCsv(csv, mockUser as User);

      expect(result.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'row' })])
      );
    });
  });

  describe('parseCsvForImportPreview', () => {
    it('should return empty array for content with no data rows', () => {
      const result = service.parseCsvForImportPreview('name,nip');

      expect(result).toEqual([]);
    });

    it('should parse rows into CsvRow objects', () => {
      const csv = 'name,nip,email\nTest Company,1234567890,test@test.com';

      const result = service.parseCsvForImportPreview(csv);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          name: 'Test Company',
          nip: '1234567890',
          email: 'test@test.com',
        })
      );
    });

    it('should limit preview to 100 rows', () => {
      const headers = 'name,nip';
      const dataRows = Array.from(
        { length: 150 },
        (_, i) => `Client ${i},${String(i).padStart(10, '0')}`
      );
      const csv = [headers, ...dataRows].join('\n');

      const result = service.parseCsvForImportPreview(csv);

      expect(result.length).toBeLessThanOrEqual(100);
    });
  });
});
