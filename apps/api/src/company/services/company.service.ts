import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole, Company } from '@accounting/common';
import { EmailService } from '@accounting/infrastructure/email';
import { CreateEmployeeDto } from '../dto/create-employee.dto';
import { UpdateEmployeeDto } from '../dto/update-employee.dto';
import { UpdateCompanySettingsDto } from '../dto/update-company-settings.dto';

@Injectable()
export class CompanyService {
  private readonly logger = new Logger(CompanyService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
    private emailService: EmailService,
  ) {}

  // Employee Management
  async getEmployees(companyId: string) {
    return this.userRepository.find({
      where: { companyId, role: UserRole.EMPLOYEE },
      order: { createdAt: 'DESC' },
    });
  }

  async getEmployeeById(companyId: string, employeeId: string) {
    const employee = await this.userRepository.findOne({
      where: { id: employeeId, companyId, role: UserRole.EMPLOYEE },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return employee;
  }

  async createEmployee(
    companyId: string,
    createEmployeeDto: CreateEmployeeDto,
    creatorName?: string,
  ) {
    const existingUser = await this.userRepository.findOne({
      where: { email: createEmployeeDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(createEmployeeDto.password, 10);

    const employee = this.userRepository.create({
      ...createEmployeeDto,
      password: hashedPassword,
      role: UserRole.EMPLOYEE,
      companyId,
      isActive: true,
    });

    const savedEmployee = await this.userRepository.save(employee);

    // Send notification email
    await this.sendUserCreatedNotification(companyId, savedEmployee, creatorName);

    return savedEmployee;
  }

  private async sendUserCreatedNotification(
    companyId: string,
    newUser: User,
    creatorName?: string,
  ) {
    try {
      const company = await this.companyRepository.findOne({
        where: { id: companyId },
        relations: ['owner'],
      });

      if (!company) {
        this.logger.warn(`Company not found for notification: ${companyId}`);
        return;
      }

      // Send notification to company owner
      const recipients = company.owner?.email ? [company.owner.email] : [];

      if (recipients.length === 0) {
        this.logger.warn(`No recipients found for user creation notification`);
        return;
      }

      await this.emailService.sendUserCreatedNotification(
        recipients,
        {
          name: `${newUser.firstName} ${newUser.lastName}`,
          email: newUser.email,
          role: newUser.role,
          companyName: company.name,
          createdByName: creatorName || 'System',
        },
        company.notificationFromEmail,
      );

      this.logger.log(`User creation notification sent for user ${newUser.id}`);
    } catch (error) {
      this.logger.error(`Failed to send user creation notification`, error);
      // Don't throw - email failure should not block user creation
    }
  }

  async updateEmployee(companyId: string, employeeId: string, updateEmployeeDto: UpdateEmployeeDto) {
    const employee = await this.getEmployeeById(companyId, employeeId);

    if (updateEmployeeDto.email && updateEmployeeDto.email !== employee.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: updateEmployeeDto.email },
      });
      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }
    }

    if (updateEmployeeDto.password) {
      updateEmployeeDto.password = await bcrypt.hash(updateEmployeeDto.password, 10);
    }

    Object.assign(employee, updateEmployeeDto);
    return this.userRepository.save(employee);
  }

  async deleteEmployee(companyId: string, employeeId: string) {
    const employee = await this.getEmployeeById(companyId, employeeId);
    employee.isActive = false;
    return this.userRepository.save(employee);
  }

  // Company Settings
  async getCompanySettings(companyId: string) {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return {
      id: company.id,
      name: company.name,
      notificationFromEmail: company.notificationFromEmail,
    };
  }

  async updateCompanySettings(companyId: string, updateDto: UpdateCompanySettingsDto) {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    if (updateDto.notificationFromEmail !== undefined) {
      company.notificationFromEmail = updateDto.notificationFromEmail || undefined;
    }

    await this.companyRepository.save(company);

    return {
      id: company.id,
      name: company.name,
      notificationFromEmail: company.notificationFromEmail,
    };
  }

  async getCompanyById(companyId: string) {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return company;
  }
}

