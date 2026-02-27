import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';

import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';

import { Company, User, UserRole } from '@accounting/common';
import { EmailConfigurationService, EmailSenderService } from '@accounting/email';
import { EmailService } from '@accounting/infrastructure/email';

import { CreateEmployeeDto } from '../dto/create-employee.dto';
import { UpdateCompanyProfileDto } from '../dto/update-company-profile.dto';
import { UpdateEmployeeDto } from '../dto/update-employee.dto';

@Injectable()
export class CompanyService {
  private readonly logger = new Logger(CompanyService.name);
  private readonly frontendUrl: string;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly emailService: EmailService,
    private readonly emailSenderService: EmailSenderService,
    private readonly emailConfigService: EmailConfigurationService,
    private readonly configService: ConfigService
  ) {
    // Use FRONTEND_URL env var, fallback to CORS_ORIGINS first value, or localhost
    this.frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      this.configService.get<string>('CORS_ORIGINS')?.split(',')[0]?.trim() ||
      'http://localhost:4200';
  }

  // Employee Management
  getEmployees(companyId: string) {
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
    creatorName?: string
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
    creatorName?: string
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

      // Get company email configuration (SMTP + IMAP for save to Sent)
      const emailConfig =
        await this.emailConfigService.getDecryptedEmailConfigByCompanyId(companyId);

      if (!emailConfig) {
        this.logger.warn(
          `No email configuration for company. Skipping employee creation notifications.`
        );
        return;
      }

      // 1. Send notification to company owner
      if (company.owner?.email) {
        const ownerNotificationHtml = `
          <h1>👤 Nowy pracownik dodany</h1>
          <p>W firmie <strong>${company.name}</strong> został dodany nowy pracownik:</p>
          <ul>
            <li><strong>Imię i nazwisko:</strong> ${newUser.firstName} ${newUser.lastName}</li>
            <li><strong>Email:</strong> ${newUser.email}</li>
            <li><strong>Rola:</strong> ${newUser.role}</li>
            <li><strong>Dodany przez:</strong> ${creatorName || 'System'}</li>
          </ul>
          <p>Pracownik został poinformowany i może teraz zalogować się do systemu.</p>
        `;

        await this.emailSenderService.sendEmailAndSave(emailConfig.smtp, emailConfig.imap, {
          to: company.owner.email,
          subject: `Nowy pracownik: ${newUser.firstName} ${newUser.lastName}`,
          html: ownerNotificationHtml,
        });

        this.logger.log(`Owner notification sent and saved to Sent`);
      }

      // 2. Send welcome email to new employee
      const employeeWelcomeHtml = `
        <h1>Witaj ${newUser.firstName} ${newUser.lastName}! 👋</h1>
        <p>Zostałeś/aś dodany/a do firmy <strong>${company.name}</strong>.</p>
        <h2>Twoje dane logowania:</h2>
        <ul>
          <li><strong>Email:</strong> ${newUser.email}</li>
          <li><strong>Hasło:</strong> (ustalone podczas rejestracji)</li>
        </ul>
        <p>Możesz zalogować się tutaj: <a href="${this.frontendUrl}/login">${this.frontendUrl}/login</a></p>
        <p>Pozdrawiamy,<br><strong>${company.name}</strong></p>
      `;

      await this.emailSenderService.sendEmailAndSave(emailConfig.smtp, emailConfig.imap, {
        to: newUser.email,
        subject: `Witaj w ${company.name}!`,
        html: employeeWelcomeHtml,
      });

      this.logger.log(`Employee welcome email sent and saved to Sent for user ${newUser.id}`);
      this.logger.log(`All user creation notifications sent successfully (owner + employee)`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to send user creation notification: ${err.message}`, err.stack);
      // Don't throw - email failure should not block user creation
    }
  }

  async updateEmployee(
    companyId: string,
    employeeId: string,
    updateEmployeeDto: UpdateEmployeeDto
  ) {
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

  async softDeleteEmployee(companyId: string, employeeId: string) {
    const employee = await this.getEmployeeById(companyId, employeeId);
    employee.isActive = false;
    return this.userRepository.save(employee);
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

  async getProfile(user: User): Promise<Company> {
    const companyId = user.companyId;
    if (!companyId) throw new NotFoundException('Company not found');
    const company = await this.companyRepository.findOne({ where: { id: companyId } });
    if (!company) throw new NotFoundException('Company not found');
    return company;
  }

  async updateProfile(user: User, dto: UpdateCompanyProfileDto): Promise<Company> {
    const companyId = user.companyId;
    if (!companyId) throw new NotFoundException('Company not found');
    const company = await this.companyRepository.findOne({ where: { id: companyId } });
    if (!company) throw new NotFoundException('Company not found');
    Object.assign(company, dto);
    return this.companyRepository.save(company);
  }
}
