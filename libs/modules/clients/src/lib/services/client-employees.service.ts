import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { Client, ClientEmployee, PaginatedResponseDto, User } from '@accounting/common';
import { TenantService } from '@accounting/common/backend';

import {
  ClientEmployeeFiltersDto,
  ClientEmployeeResponseDto,
  CreateClientEmployeeDto,
  UpdateClientEmployeeDto,
} from '../dto/client-employee.dto';

@Injectable()
export class ClientEmployeesService {
  private readonly logger = new Logger(ClientEmployeesService.name);

  constructor(
    @InjectRepository(ClientEmployee)
    private readonly employeeRepository: Repository<ClientEmployee>,
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    private readonly tenantService: TenantService
  ) {}

  /**
   * Format amount from grosze to PLN string
   */
  private formatAmount(grosze: number | undefined | null): string | undefined {
    if (grosze === undefined || grosze === null) return undefined;
    return (grosze / 100).toFixed(2).replace('.', ',') + ' zł';
  }

  /**
   * Escape special characters in LIKE patterns
   */
  private escapeLikePattern(pattern: string): string {
    return pattern.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
  }

  /**
   * Convert entity to response DTO with formatted amounts
   */
  private toResponseDto(employee: ClientEmployee): ClientEmployeeResponseDto {
    return {
      id: employee.id,
      companyId: employee.companyId,
      clientId: employee.clientId,
      firstName: employee.firstName,
      lastName: employee.lastName,
      pesel: employee.pesel,
      email: employee.email,
      phone: employee.phone,
      contractType: employee.contractType,
      position: employee.position,
      startDate: employee.startDate,
      endDate: employee.endDate,
      grossSalary: employee.grossSalary,
      grossSalaryPln: this.formatAmount(employee.grossSalary),
      workingHoursPerWeek: employee.workingHoursPerWeek
        ? Number(employee.workingHoursPerWeek)
        : undefined,
      vacationDaysPerYear: employee.vacationDaysPerYear,
      workplaceType: employee.workplaceType,
      hourlyRate: employee.hourlyRate,
      hourlyRatePln: this.formatAmount(employee.hourlyRate),
      isStudent: employee.isStudent,
      hasOtherInsurance: employee.hasOtherInsurance,
      projectDescription: employee.projectDescription,
      deliveryDate: employee.deliveryDate,
      agreedAmount: employee.agreedAmount,
      agreedAmountPln: this.formatAmount(employee.agreedAmount),
      isActive: employee.isActive,
      notes: employee.notes,
      createdBy: employee.createdBy
        ? {
            id: employee.createdBy.id,
            firstName: employee.createdBy.firstName,
            lastName: employee.createdBy.lastName,
          }
        : undefined,
      updatedBy: employee.updatedBy
        ? {
            id: employee.updatedBy.id,
            firstName: employee.updatedBy.firstName,
            lastName: employee.updatedBy.lastName,
          }
        : undefined,
      createdAt: employee.createdAt,
      updatedAt: employee.updatedAt,
    };
  }

  /**
   * Verify client belongs to user's company
   */
  private async verifyClientAccess(clientId: string, user: User): Promise<Client> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    const client = await this.clientRepository.findOne({
      where: { id: clientId, companyId },
    });

    if (!client) {
      throw new NotFoundException(`Klient o ID ${clientId} nie został znaleziony`);
    }

    return client;
  }

  /**
   * Get all employees for a client with filtering and pagination
   */
  async findAll(
    clientId: string,
    user: User,
    filters?: ClientEmployeeFiltersDto
  ): Promise<PaginatedResponseDto<ClientEmployeeResponseDto>> {
    await this.verifyClientAccess(clientId, user);

    const companyId = await this.tenantService.getEffectiveCompanyId(user);
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.employeeRepository
      .createQueryBuilder('employee')
      .leftJoinAndSelect('employee.createdBy', 'createdBy')
      .leftJoinAndSelect('employee.updatedBy', 'updatedBy')
      .where('employee.companyId = :companyId', { companyId })
      .andWhere('employee.clientId = :clientId', { clientId });

    // Apply filters
    if (filters?.search) {
      const escapedSearch = this.escapeLikePattern(filters.search);
      queryBuilder.andWhere(
        "(employee.firstName ILIKE :search ESCAPE '\\' OR employee.lastName ILIKE :search ESCAPE '\\' OR employee.email ILIKE :search ESCAPE '\\' OR employee.pesel ILIKE :search ESCAPE '\\')",
        { search: `%${escapedSearch}%` }
      );
    }

    if (filters?.contractType) {
      queryBuilder.andWhere('employee.contractType = :contractType', {
        contractType: filters.contractType,
      });
    }

    if (filters?.isActive !== undefined) {
      queryBuilder.andWhere('employee.isActive = :isActive', {
        isActive: filters.isActive,
      });
    }

    queryBuilder
      .orderBy('employee.lastName', 'ASC')
      .addOrderBy('employee.firstName', 'ASC')
      .skip(skip)
      .take(limit);

    const [employees, total] = await queryBuilder.getManyAndCount();

    const data = employees.map((e) => this.toResponseDto(e));

    return new PaginatedResponseDto(data, total, page, limit);
  }

  /**
   * Get a single employee by ID
   */
  async findOne(
    clientId: string,
    employeeId: string,
    user: User
  ): Promise<ClientEmployeeResponseDto> {
    await this.verifyClientAccess(clientId, user);

    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId, clientId, companyId },
      relations: ['createdBy', 'updatedBy'],
    });

    if (!employee) {
      throw new NotFoundException(`Pracownik o ID ${employeeId} nie został znaleziony`);
    }

    return this.toResponseDto(employee);
  }

  /**
   * Create a new employee for a client
   */
  async create(
    clientId: string,
    dto: CreateClientEmployeeDto,
    user: User
  ): Promise<ClientEmployeeResponseDto> {
    await this.verifyClientAccess(clientId, user);

    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    const employee = this.employeeRepository.create({
      ...dto,
      companyId,
      clientId,
      createdById: user.id,
    });

    const savedEmployee = await this.employeeRepository.save(employee);

    this.logger.log(`Created client employee`, {
      employeeId: savedEmployee.id,
      clientId,
      companyId,
      userId: user.id,
    });

    // Reload with relations
    return this.findOne(clientId, savedEmployee.id, user);
  }

  /**
   * Update an existing employee
   */
  async update(
    clientId: string,
    employeeId: string,
    dto: UpdateClientEmployeeDto,
    user: User
  ): Promise<ClientEmployeeResponseDto> {
    await this.verifyClientAccess(clientId, user);

    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId, clientId, companyId },
    });

    if (!employee) {
      throw new NotFoundException(`Pracownik o ID ${employeeId} nie został znaleziony`);
    }

    // Handle null values for optional fields (clear them)
    const updateData: Partial<ClientEmployee> = {};

    for (const [key, value] of Object.entries(dto)) {
      if (value === null) {
        (updateData as Record<string, unknown>)[key] = null;
      } else if (value !== undefined) {
        (updateData as Record<string, unknown>)[key] = value;
      }
    }

    Object.assign(employee, updateData);
    employee.updatedById = user.id;

    await this.employeeRepository.save(employee);

    this.logger.log(`Updated client employee`, {
      employeeId,
      clientId,
      companyId,
      userId: user.id,
    });

    return this.findOne(clientId, employeeId, user);
  }

  /**
   * Soft delete an employee (set isActive to false)
   */
  async remove(clientId: string, employeeId: string, user: User): Promise<void> {
    await this.verifyClientAccess(clientId, user);

    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId, clientId, companyId },
    });

    if (!employee) {
      throw new NotFoundException(`Pracownik o ID ${employeeId} nie został znaleziony`);
    }

    employee.isActive = false;
    employee.updatedById = user.id;

    await this.employeeRepository.save(employee);

    this.logger.log(`Soft-deleted client employee`, {
      employeeId,
      clientId,
      companyId,
      userId: user.id,
    });
  }

  /**
   * Restore a soft-deleted employee
   */
  async restore(
    clientId: string,
    employeeId: string,
    user: User
  ): Promise<ClientEmployeeResponseDto> {
    await this.verifyClientAccess(clientId, user);

    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId, clientId, companyId, isActive: false },
    });

    if (!employee) {
      throw new NotFoundException(
        `Pracownik o ID ${employeeId} nie został znaleziony lub nie jest usunięty`
      );
    }

    employee.isActive = true;
    employee.updatedById = user.id;

    await this.employeeRepository.save(employee);

    this.logger.log(`Restored client employee`, {
      employeeId,
      clientId,
      companyId,
      userId: user.id,
    });

    return this.findOne(clientId, employeeId, user);
  }
}
