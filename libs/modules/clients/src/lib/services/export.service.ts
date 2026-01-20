import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource, EntityManager } from 'typeorm';
import {
  Client,
  User,
  EmploymentType,
  VatStatus,
  TaxScheme,
  ZusStatus,
} from '@accounting/common';
import { TenantService } from '@accounting/common/backend';
import { ChangeLogService } from '@accounting/infrastructure/change-log';
import { ClientFiltersDto } from '../dto/client.dto';

// Type alias for backward compatibility
type ClientFilters = ClientFiltersDto;

export interface ImportResultDto {
  imported: number;
  updated: number;
  errors: ImportErrorDto[];
}

export interface ImportErrorDto {
  row: number;
  field: string;
  message: string;
}

interface CsvRow {
  name: string;
  nip?: string;
  email?: string;
  phone?: string;
  employmentType?: string;
  vatStatus?: string;
  taxScheme?: string;
  zusStatus?: string;
  companySpecificity?: string;
  additionalInfo?: string;
}

@Injectable()
export class ClientExportService {
  private readonly logger = new Logger(ClientExportService.name);

  constructor(
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    private readonly changeLogService: ChangeLogService,
    private readonly tenantService: TenantService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Export clients to CSV format.
   */
  async exportToCsv(filters: ClientFilters, user: User): Promise<Buffer> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    // Build query with filters
    const queryBuilder = this.clientRepository
      .createQueryBuilder('client')
      .where('client.companyId = :companyId', { companyId });

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

    if (filters?.isActive !== undefined) {
      queryBuilder.andWhere('client.isActive = :isActive', {
        isActive: filters.isActive,
      });
    }

    if (filters?.search) {
      const escapedSearch = this.escapeLikePattern(filters.search);
      queryBuilder.andWhere(
        "(client.name ILIKE :search ESCAPE '\\' OR client.nip ILIKE :search ESCAPE '\\' OR client.email ILIKE :search ESCAPE '\\')",
        { search: `%${escapedSearch}%` },
      );
    }

    queryBuilder.orderBy('client.name', 'ASC');

    const clients = await queryBuilder.getMany();

    // Generate CSV content
    const csvContent = this.generateCsv(clients);
    return Buffer.from(csvContent, 'utf-8');
  }

  /**
   * Generate CSV template for import.
   */
  getTemplate(): Buffer {
    const headers = [
      'name',
      'nip',
      'email',
      'phone',
      'employmentType',
      'vatStatus',
      'taxScheme',
      'zusStatus',
      'companySpecificity',
      'additionalInfo',
    ];

    const exampleRow = [
      'Przykładowa Firma Sp. z o.o.',
      '1234567890',
      'kontakt@firma.pl',
      '+48 123 456 789',
      'SELF_EMPLOYED',
      'YES',
      'GENERAL',
      'FULL',
      'Specyfika działalności',
      'Dodatkowe informacje',
    ];

    const csvContent = [
      headers.join(','),
      exampleRow.map(this.escapeCsvField).join(','),
    ].join('\n');

    return Buffer.from(csvContent, 'utf-8');
  }

  /**
   * Import clients from CSV content.
   * Uses a database transaction to ensure atomicity - all rows succeed or none.
   */
  async importFromCsv(content: string, user: User): Promise<ImportResultDto> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    // Parse CSV
    const lines = content.split('\n').filter((line) => line.trim());
    if (lines.length < 2) {
      throw new BadRequestException('Plik CSV musi zawierać nagłówki i co najmniej jeden wiersz danych');
    }

    const headers = this.parseCsvLine(lines[0]);
    const requiredHeaders = ['name'];
    for (const required of requiredHeaders) {
      if (!headers.includes(required)) {
        throw new BadRequestException(`Brak wymaganego nagłówka: ${required}`);
      }
    }

    // Pre-validate all rows FIRST before starting transaction
    const parsedRows: { rowNumber: number; row: CsvRow }[] = [];
    const validationErrors: ImportErrorDto[] = [];

    for (let i = 1; i < lines.length; i++) {
      const rowNumber = i + 1;
      const values = this.parseCsvLine(lines[i]);

      if (values.length < headers.length) {
        validationErrors.push({
          row: rowNumber,
          field: 'row',
          message: 'Nieprawidłowa liczba kolumn',
        });
        continue;
      }

      const row: CsvRow = {} as CsvRow;
      for (let j = 0; j < headers.length; j++) {
        const header = headers[j] as keyof CsvRow;
        row[header] = values[j]?.trim() || undefined;
      }

      // Validate row
      const rowErrors = this.validateRow(row, rowNumber);
      if (rowErrors.length > 0) {
        validationErrors.push(...rowErrors);
        continue;
      }

      parsedRows.push({ rowNumber, row });
    }

    // If there are validation errors, return them without starting transaction
    if (validationErrors.length > 0) {
      return {
        imported: 0,
        updated: 0,
        errors: validationErrors,
      };
    }

    // No validation errors - proceed with transaction
    return this.dataSource.transaction(async (manager: EntityManager) => {
      const result: ImportResultDto = {
        imported: 0,
        updated: 0,
        errors: [],
      };

      const clientRepo = manager.getRepository(Client);

      for (const { rowNumber, row } of parsedRows) {
        try {
          // Check if client with same NIP exists
          let existingClient: Client | null = null;
          if (row.nip) {
            existingClient = await clientRepo.findOne({
              where: { companyId, nip: row.nip },
            });
          }

          if (existingClient) {
            // Update existing client
            const oldValues = this.sanitizeClientForLog(existingClient);
            Object.assign(existingClient, this.mapRowToClient(row));
            existingClient.updatedById = user.id;
            await clientRepo.save(existingClient);

            await this.changeLogService.logUpdate(
              'Client',
              existingClient.id,
              oldValues,
              this.sanitizeClientForLog(existingClient),
              user,
            );

            result.updated++;
          } else {
            // Create new client
            const client = clientRepo.create({
              ...this.mapRowToClient(row),
              companyId,
              createdById: user.id,
            });

            const savedClient = await clientRepo.save(client);

            await this.changeLogService.logCreate(
              'Client',
              savedClient.id,
              this.sanitizeClientForLog(savedClient),
              user,
            );

            result.imported++;
          }
        } catch (error) {
          this.logger.error(`Error importing row ${rowNumber}`, error);
          // Re-throw to trigger transaction rollback
          throw new BadRequestException(`Błąd podczas importu wiersza ${rowNumber}: ${error instanceof Error ? error.message : 'Nieznany błąd'}`);
        }
      }

      return result;
    });
  }

  /**
   * Parse a single row of imported CSV to preview before committing.
   */
  parseForPreview(content: string): CsvRow[] {
    const lines = content.split('\n').filter((line) => line.trim());
    if (lines.length < 2) {
      return [];
    }

    const headers = this.parseCsvLine(lines[0]);
    const rows: CsvRow[] = [];

    for (let i = 1; i < lines.length && i <= 100; i++) {
      const values = this.parseCsvLine(lines[i]);
      const row: CsvRow = {} as CsvRow;

      for (let j = 0; j < headers.length; j++) {
        const header = headers[j] as keyof CsvRow;
        row[header] = values[j]?.trim() || undefined;
      }

      rows.push(row);
    }

    return rows;
  }

  private generateCsv(clients: Client[]): string {
    const headers = [
      'name',
      'nip',
      'email',
      'phone',
      'employmentType',
      'vatStatus',
      'taxScheme',
      'zusStatus',
      'companySpecificity',
      'additionalInfo',
      'isActive',
    ];

    const rows = clients.map((client) => [
      client.name,
      client.nip || '',
      client.email || '',
      client.phone || '',
      client.employmentType || '',
      client.vatStatus || '',
      client.taxScheme || '',
      client.zusStatus || '',
      client.companySpecificity || '',
      client.additionalInfo || '',
      client.isActive ? 'true' : 'false',
    ]);

    return [
      headers.join(','),
      ...rows.map((row) => row.map(this.escapeCsvField).join(',')),
    ].join('\n');
  }

  /**
   * Escape special LIKE pattern characters to prevent SQL injection.
   */
  private escapeLikePattern(pattern: string): string {
    return pattern
      .replace(/\\/g, '\\\\')
      .replace(/%/g, '\\%')
      .replace(/_/g, '\\_');
  }

  /**
   * Escape a CSV field value for safe export.
   * Protects against CSV injection (formula injection) and handles special characters.
   */
  private escapeCsvField(field: string): string {
    if (!field) return '';

    let value = field;

    // CSV injection protection: prefix values starting with formula characters
    // This prevents Excel/Sheets from interpreting them as formulas
    const formulaChars = ['=', '+', '-', '@', '\t', '\r'];
    if (formulaChars.some(char => value.startsWith(char))) {
      value = "'" + value;
    }

    // Handle special characters that require quoting
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (inQuotes) {
        if (char === '"') {
          if (line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          current += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',') {
          result.push(current);
          current = '';
        } else {
          current += char;
        }
      }
    }

    result.push(current);
    return result;
  }

  private validateRow(row: CsvRow, rowNumber: number): ImportErrorDto[] {
    const errors: ImportErrorDto[] = [];

    // Required fields
    if (!row.name || row.name.length < 2) {
      errors.push({
        row: rowNumber,
        field: 'name',
        message: 'Nazwa jest wymagana i musi mieć minimum 2 znaki',
      });
    }

    // NIP validation
    if (row.nip && !/^\d{10}$/.test(row.nip)) {
      errors.push({
        row: rowNumber,
        field: 'nip',
        message: 'NIP musi składać się z 10 cyfr',
      });
    }

    // Email validation
    if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
      errors.push({
        row: rowNumber,
        field: 'email',
        message: 'Nieprawidłowy format adresu email',
      });
    }

    // Enum validations
    if (row.employmentType && !Object.values(EmploymentType).includes(row.employmentType as EmploymentType)) {
      errors.push({
        row: rowNumber,
        field: 'employmentType',
        message: `Nieprawidłowy typ zatrudnienia. Dozwolone: ${Object.values(EmploymentType).join(', ')}`,
      });
    }

    if (row.vatStatus && !Object.values(VatStatus).includes(row.vatStatus as VatStatus)) {
      errors.push({
        row: rowNumber,
        field: 'vatStatus',
        message: `Nieprawidłowy status VAT. Dozwolone: ${Object.values(VatStatus).join(', ')}`,
      });
    }

    if (row.taxScheme && !Object.values(TaxScheme).includes(row.taxScheme as TaxScheme)) {
      errors.push({
        row: rowNumber,
        field: 'taxScheme',
        message: `Nieprawidłowy schemat podatkowy. Dozwolone: ${Object.values(TaxScheme).join(', ')}`,
      });
    }

    if (row.zusStatus && !Object.values(ZusStatus).includes(row.zusStatus as ZusStatus)) {
      errors.push({
        row: rowNumber,
        field: 'zusStatus',
        message: `Nieprawidłowy status ZUS. Dozwolone: ${Object.values(ZusStatus).join(', ')}`,
      });
    }

    return errors;
  }

  private mapRowToClient(row: CsvRow): Partial<Client> {
    return {
      name: row.name,
      nip: row.nip,
      email: row.email,
      phone: row.phone,
      employmentType: row.employmentType as EmploymentType | undefined,
      vatStatus: row.vatStatus as VatStatus | undefined,
      taxScheme: row.taxScheme as TaxScheme | undefined,
      zusStatus: row.zusStatus as ZusStatus | undefined,
      companySpecificity: row.companySpecificity,
      additionalInfo: row.additionalInfo,
    };
  }

  private sanitizeClientForLog(client: Client): Record<string, unknown> {
    return {
      name: client.name,
      nip: client.nip,
      email: client.email,
      phone: client.phone,
      employmentType: client.employmentType,
      vatStatus: client.vatStatus,
      taxScheme: client.taxScheme,
      zusStatus: client.zusStatus,
      companySpecificity: client.companySpecificity,
      additionalInfo: client.additionalInfo,
      isActive: client.isActive,
    };
  }
}
