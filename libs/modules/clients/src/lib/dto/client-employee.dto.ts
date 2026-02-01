import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';

import { EmployeeContractType, WorkplaceType } from '@accounting/common';

/**
 * DTO for creating a client employee
 */
export class CreateClientEmployeeDto {
  // ============================================
  // Personal Data
  // ============================================

  @ApiProperty({ description: 'Employee first name', example: 'Jan' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  firstName!: string;

  @ApiProperty({ description: 'Employee last name', example: 'Kowalski' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  lastName!: string;

  @ApiPropertyOptional({
    description: 'PESEL (11-digit Polish identification number)',
    example: '90010112345',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{11}$/, { message: 'PESEL musi składać się z 11 cyfr' })
  pesel?: string;

  @ApiPropertyOptional({
    description: 'Employee email address',
    example: 'jan.kowalski@example.com',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Nieprawidłowy adres email' })
  email?: string;

  @ApiPropertyOptional({
    description: 'Employee phone number',
    example: '+48 123 456 789',
  })
  @IsOptional()
  @IsString()
  @Length(0, 50)
  phone?: string;

  // ============================================
  // Employment Data (Common)
  // ============================================

  @ApiProperty({
    description: 'Type of employment contract',
    enum: EmployeeContractType,
    example: EmployeeContractType.UMOWA_O_PRACE,
  })
  @IsEnum(EmployeeContractType)
  contractType!: EmployeeContractType;

  @ApiPropertyOptional({
    description: 'Job position/title',
    example: 'Specjalista ds. marketingu',
  })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  position?: string;

  @ApiProperty({
    description: 'Employment start date',
    example: '2024-01-01',
  })
  @Type(() => Date)
  @IsDate()
  startDate!: Date;

  @ApiPropertyOptional({
    description: 'Employment end date (for fixed-term contracts)',
    example: '2024-12-31',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @ApiPropertyOptional({
    description: 'Gross salary in grosze (PLN * 100)',
    example: 850000,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  grossSalary?: number;

  // ============================================
  // UMOWA_O_PRACE specific fields
  // ============================================

  @ApiPropertyOptional({
    description: 'Working hours per week (e.g., 40 for full-time)',
    example: 40,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(168)
  workingHoursPerWeek?: number;

  @ApiPropertyOptional({
    description: 'Vacation days per year',
    example: 26,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  vacationDaysPerYear?: number;

  @ApiPropertyOptional({
    description: 'Type of workplace',
    enum: WorkplaceType,
    example: WorkplaceType.OFFICE,
  })
  @IsOptional()
  @IsEnum(WorkplaceType)
  workplaceType?: WorkplaceType;

  // ============================================
  // UMOWA_ZLECENIE specific fields
  // ============================================

  @ApiPropertyOptional({
    description: 'Hourly rate in grosze (PLN * 100)',
    example: 5000,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  hourlyRate?: number;

  @ApiPropertyOptional({
    description: 'Is the employee a student (under 26)',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isStudent?: boolean;

  @ApiPropertyOptional({
    description: 'Has other insurance (e.g., from another job)',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  hasOtherInsurance?: boolean;

  // ============================================
  // UMOWA_O_DZIELO specific fields
  // ============================================

  @ApiPropertyOptional({
    description: 'Project description for work contract',
    example: 'Przygotowanie dokumentacji technicznej systemu',
  })
  @IsOptional()
  @IsString()
  projectDescription?: string;

  @ApiPropertyOptional({
    description: 'Project delivery date',
    example: '2024-03-31',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  deliveryDate?: Date;

  @ApiPropertyOptional({
    description: 'Agreed amount for the work in grosze (PLN * 100)',
    example: 1500000,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  agreedAmount?: number;

  // ============================================
  // Status and Notes
  // ============================================

  @ApiPropertyOptional({
    description: 'Additional notes about the employee',
    example: 'Pracownik zdalny, wymaga VPN',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO for updating a client employee
 */
export class UpdateClientEmployeeDto {
  @ApiPropertyOptional({ description: 'Employee first name', example: 'Jan' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  firstName?: string;

  @ApiPropertyOptional({ description: 'Employee last name', example: 'Kowalski' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  lastName?: string;

  @ApiPropertyOptional({
    description: 'PESEL (11-digit Polish identification number)',
    example: '90010112345',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{11}$/, { message: 'PESEL musi składać się z 11 cyfr' })
  pesel?: string;

  @ApiPropertyOptional({
    description: 'Employee email address',
    example: 'jan.kowalski@example.com',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Nieprawidłowy adres email' })
  email?: string;

  @ApiPropertyOptional({
    description: 'Employee phone number',
    example: '+48 123 456 789',
  })
  @IsOptional()
  @IsString()
  @Length(0, 50)
  phone?: string;

  @ApiPropertyOptional({
    description: 'Type of employment contract',
    enum: EmployeeContractType,
    example: EmployeeContractType.UMOWA_O_PRACE,
  })
  @IsOptional()
  @IsEnum(EmployeeContractType)
  contractType?: EmployeeContractType;

  @ApiPropertyOptional({
    description: 'Job position/title',
    example: 'Specjalista ds. marketingu',
  })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  position?: string;

  @ApiPropertyOptional({
    description: 'Employment start date',
    example: '2024-01-01',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @ApiPropertyOptional({
    description: 'Employment end date (for fixed-term contracts)',
    example: '2024-12-31',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  @Transform(({ value }) => (value === '' || value === null ? undefined : value))
  endDate?: Date | null;

  @ApiPropertyOptional({
    description: 'Gross salary in grosze (PLN * 100)',
    example: 850000,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Transform(({ value }) => (value === '' || value === null ? undefined : value))
  grossSalary?: number | null;

  @ApiPropertyOptional({
    description: 'Working hours per week (e.g., 40 for full-time)',
    example: 40,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(168)
  @Transform(({ value }) => (value === '' || value === null ? undefined : value))
  workingHoursPerWeek?: number | null;

  @ApiPropertyOptional({
    description: 'Vacation days per year',
    example: 26,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  @Transform(({ value }) => (value === '' || value === null ? undefined : value))
  vacationDaysPerYear?: number | null;

  @ApiPropertyOptional({
    description: 'Type of workplace',
    enum: WorkplaceType,
    example: WorkplaceType.OFFICE,
  })
  @IsOptional()
  @IsEnum(WorkplaceType)
  @Transform(({ value }) => (value === '' || value === null ? undefined : value))
  workplaceType?: WorkplaceType | null;

  @ApiPropertyOptional({
    description: 'Hourly rate in grosze (PLN * 100)',
    example: 5000,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Transform(({ value }) => (value === '' || value === null ? undefined : value))
  hourlyRate?: number | null;

  @ApiPropertyOptional({
    description: 'Is the employee a student (under 26)',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => (value === '' || value === null ? undefined : value))
  isStudent?: boolean | null;

  @ApiPropertyOptional({
    description: 'Has other insurance (e.g., from another job)',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => (value === '' || value === null ? undefined : value))
  hasOtherInsurance?: boolean | null;

  @ApiPropertyOptional({
    description: 'Project description for work contract',
    example: 'Przygotowanie dokumentacji technicznej systemu',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' || value === null ? undefined : value))
  projectDescription?: string | null;

  @ApiPropertyOptional({
    description: 'Project delivery date',
    example: '2024-03-31',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  @Transform(({ value }) => (value === '' || value === null ? undefined : value))
  deliveryDate?: Date | null;

  @ApiPropertyOptional({
    description: 'Agreed amount for the work in grosze (PLN * 100)',
    example: 1500000,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Transform(({ value }) => (value === '' || value === null ? undefined : value))
  agreedAmount?: number | null;

  @ApiPropertyOptional({
    description: 'Whether the employee is active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Additional notes about the employee',
    example: 'Pracownik zdalny, wymaga VPN',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' || value === null ? undefined : value))
  notes?: string | null;
}

/**
 * DTO for filtering client employees
 */
export class ClientEmployeeFiltersDto {
  @ApiPropertyOptional({ description: 'Search by name, email, or PESEL' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by contract type',
    enum: EmployeeContractType,
  })
  @IsOptional()
  @IsEnum(EmployeeContractType)
  contractType?: EmployeeContractType;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

/**
 * Response DTO for client employee
 */
export class ClientEmployeeResponseDto {
  @ApiProperty({ description: 'Employee ID' })
  id!: string;

  @ApiProperty({ description: 'Company ID (multi-tenancy)' })
  companyId!: string;

  @ApiProperty({ description: 'Client ID' })
  clientId!: string;

  @ApiProperty({ description: 'Employee first name' })
  firstName!: string;

  @ApiProperty({ description: 'Employee last name' })
  lastName!: string;

  @ApiPropertyOptional({ description: 'PESEL' })
  pesel?: string;

  @ApiPropertyOptional({ description: 'Email address' })
  email?: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  phone?: string;

  @ApiProperty({ description: 'Contract type', enum: EmployeeContractType })
  contractType!: EmployeeContractType;

  @ApiPropertyOptional({ description: 'Job position' })
  position?: string;

  @ApiProperty({ description: 'Start date' })
  startDate!: Date;

  @ApiPropertyOptional({ description: 'End date' })
  endDate?: Date;

  @ApiPropertyOptional({ description: 'Gross salary in grosze' })
  grossSalary?: number;

  @ApiPropertyOptional({ description: 'Gross salary formatted in PLN' })
  grossSalaryPln?: string;

  // UMOWA_O_PRACE fields
  @ApiPropertyOptional({ description: 'Working hours per week' })
  workingHoursPerWeek?: number;

  @ApiPropertyOptional({ description: 'Vacation days per year' })
  vacationDaysPerYear?: number;

  @ApiPropertyOptional({ description: 'Workplace type', enum: WorkplaceType })
  workplaceType?: WorkplaceType;

  // UMOWA_ZLECENIE fields
  @ApiPropertyOptional({ description: 'Hourly rate in grosze' })
  hourlyRate?: number;

  @ApiPropertyOptional({ description: 'Hourly rate formatted in PLN' })
  hourlyRatePln?: string;

  @ApiPropertyOptional({ description: 'Is student' })
  isStudent?: boolean;

  @ApiPropertyOptional({ description: 'Has other insurance' })
  hasOtherInsurance?: boolean;

  // UMOWA_O_DZIELO fields
  @ApiPropertyOptional({ description: 'Project description' })
  projectDescription?: string;

  @ApiPropertyOptional({ description: 'Delivery date' })
  deliveryDate?: Date;

  @ApiPropertyOptional({ description: 'Agreed amount in grosze' })
  agreedAmount?: number;

  @ApiPropertyOptional({ description: 'Agreed amount formatted in PLN' })
  agreedAmountPln?: string;

  @ApiProperty({ description: 'Is active' })
  isActive!: boolean;

  @ApiPropertyOptional({ description: 'Notes' })
  notes?: string;

  @ApiPropertyOptional({ description: 'Created by user' })
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };

  @ApiPropertyOptional({ description: 'Updated by user' })
  updatedBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };

  @ApiProperty({ description: 'Created at' })
  createdAt!: Date;

  @ApiProperty({ description: 'Updated at' })
  updatedAt!: Date;
}

/**
 * Paginated response for client employees
 */
export class PaginatedClientEmployeesResponseDto {
  @ApiProperty({ type: [ClientEmployeeResponseDto] })
  data!: ClientEmployeeResponseDto[];

  @ApiProperty({ description: 'Total count' })
  total!: number;

  @ApiProperty({ description: 'Current page' })
  page!: number;

  @ApiProperty({ description: 'Items per page' })
  limit!: number;

  @ApiProperty({ description: 'Total pages' })
  totalPages!: number;
}
