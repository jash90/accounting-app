import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import {
  User,
  Company,
  Module as ModuleEntity,
  CompanyModuleAccess,
  UserModulePermission,
  UserRole,
  Client,
  ClientFieldDefinition,
  EmploymentType,
  VatStatus,
  TaxScheme,
  ZusStatus,
  CustomFieldType,
} from '@accounting/common';
import { EmailConfigurationService } from '@accounting/email';
import { ModuleDiscoveryService } from '@accounting/rbac';

@Injectable()
export class SeederService {
  private readonly logger = new Logger(SeederService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
    @InjectRepository(ModuleEntity)
    private moduleRepository: Repository<ModuleEntity>,
    @InjectRepository(CompanyModuleAccess)
    private companyModuleAccessRepository: Repository<CompanyModuleAccess>,
    @InjectRepository(UserModulePermission)
    private userModulePermissionRepository: Repository<UserModulePermission>,
    @InjectRepository(Client)
    private clientRepository: Repository<Client>,
    @InjectRepository(ClientFieldDefinition)
    private fieldDefinitionRepository: Repository<ClientFieldDefinition>,
    private dataSource: DataSource,
    private emailConfigService: EmailConfigurationService,
    private moduleDiscoveryService: ModuleDiscoveryService,
    private configService: ConfigService,
  ) { }

  async seed() {
    this.logger.log('Starting database seeding...');

    // Clear existing data
    await this.clearDatabase();

    // Re-sync modules after clearing database
    // (ModuleDiscoveryService synced during app init, but clearDatabase() truncated the table)
    this.logger.log('Re-syncing modules after database clear...');
    await this.moduleDiscoveryService.reloadModules();

    // Seed data in correct order
    const admin = await this.seedAdmin();
    const _systemCompany = await this.seedSystemAdminCompany(admin);
    const { companyA, ownerA, employeesA } = await this.seedCompanyA();
    await this.seedEmailConfigurations(companyA, ownerA, employeesA);

    // Use file-based module discovery instead of manual seeding
    // Modules are now synced in the database after reloadModules()
    this.logger.log('Using file-based module discovery...');
    const modules = await this.getDiscoveredModulesFromDb();

    if (modules.length === 0) {
      this.logger.warn('No modules found! Make sure module.json files exist in libs/modules/*/');
    } else {
      this.logger.log(`Found ${modules.length} modules from discovery: ${modules.map(m => m.slug).join(', ')}`);
    }

    await this.seedModuleAccess(companyA, modules);
    await this.seedEmployeePermissions(employeesA, modules);
    await this.seedClients(companyA, ownerA);

    this.logger.log('Database seeding completed!');
    this.logger.log('Test Users (passwords configured in .env):');
    this.logger.log(`  Admin: ${this.configService.get('SEED_ADMIN_EMAIL', 'admin@system.com')}`);
    this.logger.log(`  Company Owner: ${this.configService.get('SEED_OWNER_EMAIL', 'owner@company.pl')}`);
    this.logger.log(`  Employee: ${this.configService.get('SEED_EMPLOYEE_EMAIL', 'employee@company.pl')}`);
  }

  /**
   * Get modules from database that were discovered and synced by ModuleDiscoveryService.
   * Includes timeout protection to prevent infinite waiting.
   */
  private async getDiscoveredModulesFromDb(): Promise<ModuleEntity[]> {
    const startTime = Date.now();
    const timeoutMs = 5000;
    const maxRetries = 25;
    const retryDelayMs = 200;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      if (this.moduleDiscoveryService.isDiscoveryComplete()) {
        break;
      }
      if (Date.now() - startTime > timeoutMs) {
        this.logger.warn('Module discovery timeout, proceeding with available modules');
        break;
      }
      if (attempt === 0) {
        this.logger.log('Waiting for module discovery to complete...');
      }
      await new Promise(resolve => setTimeout(resolve, retryDelayMs));
    }

    if (!this.moduleDiscoveryService.isDiscoveryComplete()) {
      this.logger.warn('Module discovery did not complete in time, proceeding with available modules');
    }

    // Get all active modules from database
    return this.moduleRepository.find({
      where: { isActive: true },
    });
  }

  private async clearDatabase() {
    // Use TRUNCATE with CASCADE to efficiently clear all tables
    // This handles foreign key constraints automatically
    //
    // IMPORTANT: Keep this list in sync with database schema!
    // When adding new entities, update this list to include them.
    // Order matters: tables with foreign key dependencies should come first.
    //
    // Last updated: 2025-01 (time tracking tables added)
    const tablesToTruncate = [
      // AI module tables
      'ai_messages',
      'ai_conversations',
      'ai_contexts',
      'ai_configurations',
      'token_usages',
      'token_limits',
      // Time tracking tables
      'time_entries',
      'time_settings',
      // RBAC tables
      'user_module_permissions',
      'company_module_access',
      'modules',
      // Client module tables
      'client_icon_assignments',
      'client_icons',
      'client_custom_field_values',
      'client_field_definitions',
      'notification_settings',
      'change_logs',
      'clients',
      // Core tables (must be last due to FK dependencies)
      'users',
      'companies',
    ];

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      const tableList = tablesToTruncate.join(', ');
      this.logger.log(`Truncating ${tablesToTruncate.length} tables...`);
      await queryRunner.query(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`);
      this.logger.log('Database tables truncated successfully');
    } catch (error) {
      this.logger.error('Failed to truncate tables', (error as Error).message);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async seedAdmin() {
    const adminEmail = this.configService.get<string>('SEED_ADMIN_EMAIL', 'admin@system.com');
    const adminPassword = this.configService.get<string>('SEED_ADMIN_PASSWORD', 'Admin123456!');
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    const admin = this.userRepository.create({
      email: adminEmail.toLowerCase(),
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.ADMIN,
      companyId: null,
      isActive: true,
    });
    return this.userRepository.save(admin);
  }

  private async seedSystemAdminCompany(admin: User) {
    this.logger.log('Creating System Admin company...');
    const systemCompany = this.companyRepository.create({
      name: 'System Admin',
      ownerId: admin.id,
      isSystemCompany: true,
      isActive: true,
    });
    const savedCompany = await this.companyRepository.save(systemCompany);
    this.logger.log('System Admin company created');
    return savedCompany;
  }

  private async seedCompanyA() {
    const ownerEmail = this.configService.get<string>('SEED_OWNER_EMAIL', 'owner@company.pl');
    const ownerPassword = this.configService.get<string>('SEED_OWNER_PASSWORD', 'Owner123456!');
    const hashedPassword = await bcrypt.hash(ownerPassword, 10);
    const ownerA = this.userRepository.create({
      email: ownerEmail.toLowerCase(),
      password: hashedPassword,
      firstName: 'Owner',
      lastName: 'A',
      role: UserRole.COMPANY_OWNER,
      isActive: true,
    });
    const savedOwnerA = await this.userRepository.save(ownerA);

    const companyA = this.companyRepository.create({
      name: 'Tech Startup A',
      ownerId: savedOwnerA.id,
      isActive: true,
    });
    const savedCompanyA = await this.companyRepository.save(companyA);

    savedOwnerA.companyId = savedCompanyA.id;
    await this.userRepository.save(savedOwnerA);

    const employeeEmail = this.configService.get<string>('SEED_EMPLOYEE_EMAIL', 'employee@company.pl');
    const employeePassword = this.configService.get<string>('SEED_EMPLOYEE_PASSWORD', 'Employee123456!');
    const employee1Password = await bcrypt.hash(employeePassword, 10);
    const employee1 = this.userRepository.create({
      email: employeeEmail.toLowerCase(),
      password: employee1Password,
      firstName: 'Employee',
      lastName: '1A',
      role: UserRole.EMPLOYEE,
      companyId: savedCompanyA.id,
      isActive: true,
    });
    const savedEmployee1 = await this.userRepository.save(employee1);

    return {
      companyA: savedCompanyA,
      ownerA: savedOwnerA,
      employeesA: [savedEmployee1],
    };
  }

  // seedModules() method removed - using file-based module discovery via ModuleDiscoveryService
  // Modules are now auto-discovered from libs/modules/*/module.json files

  private async seedModuleAccess(
    companyA: Company,
    modules: ModuleEntity[],
  ) {
    // Company A: ai-agent, clients, email-client, tasks, time-tracking
    const aiAgentModule = modules.find((m) => m.slug === 'ai-agent');
    const clientsModule = modules.find((m) => m.slug === 'clients');
    const emailClientModule = modules.find((m) => m.slug === 'email-client');
    const tasksModule = modules.find((m) => m.slug === 'tasks');
    const timeTrackingModule = modules.find((m) => m.slug === 'time-tracking');

    if (aiAgentModule) {
      await this.companyModuleAccessRepository.save(
        this.companyModuleAccessRepository.create({
          companyId: companyA.id,
          moduleId: aiAgentModule.id,
          isEnabled: true,
        }),
      );
    }

    if (clientsModule) {
      await this.companyModuleAccessRepository.save(
        this.companyModuleAccessRepository.create({
          companyId: companyA.id,
          moduleId: clientsModule.id,
          isEnabled: true,
        }),
      );
    }

    if (emailClientModule) {
      await this.companyModuleAccessRepository.save(
        this.companyModuleAccessRepository.create({
          companyId: companyA.id,
          moduleId: emailClientModule.id,
          isEnabled: true,
        }),
      );
    }

    if (tasksModule) {
      await this.companyModuleAccessRepository.save(
        this.companyModuleAccessRepository.create({
          companyId: companyA.id,
          moduleId: tasksModule.id,
          isEnabled: true,
        }),
      );
    }

    if (timeTrackingModule) {
      await this.companyModuleAccessRepository.save(
        this.companyModuleAccessRepository.create({
          companyId: companyA.id,
          moduleId: timeTrackingModule.id,
          isEnabled: true,
        }),
      );
    }
  }

  private async seedEmployeePermissions(
    employeesA: User[],
    modules: ModuleEntity[],
  ) {
    const aiAgentModule = modules.find((m) => m.slug === 'ai-agent');
    const clientsModule = modules.find((m) => m.slug === 'clients');
    const emailClientModule = modules.find((m) => m.slug === 'email-client');
    const tasksModule = modules.find((m) => m.slug === 'tasks');
    const timeTrackingModule = modules.find((m) => m.slug === 'time-tracking');

    // Employee 1A: read, write for all modules
    const employee = employeesA[0];
    if (!employee) return;

    if (!employee.companyId) {
      this.logger.warn('Employee has no companyId, skipping permissions');
      return;
    }
    const company = await this.companyRepository.findOne({ where: { id: employee.companyId } });
    if (!company?.ownerId) {
      this.logger.warn('Company or owner not found, skipping permissions');
      return;
    }
    const grantedById = company.ownerId;

    if (aiAgentModule) {
      await this.userModulePermissionRepository.save(
        this.userModulePermissionRepository.create({
          userId: employee.id,
          moduleId: aiAgentModule.id,
          permissions: ['read', 'write'],
          grantedById,
        }),
      );
    }

    if (clientsModule) {
      await this.userModulePermissionRepository.save(
        this.userModulePermissionRepository.create({
          userId: employee.id,
          moduleId: clientsModule.id,
          permissions: ['read', 'write'],
          grantedById,
        }),
      );
    }

    if (emailClientModule) {
      await this.userModulePermissionRepository.save(
        this.userModulePermissionRepository.create({
          userId: employee.id,
          moduleId: emailClientModule.id,
          permissions: ['read', 'write'],
          grantedById,
        }),
      );
    }

    if (tasksModule) {
      await this.userModulePermissionRepository.save(
        this.userModulePermissionRepository.create({
          userId: employee.id,
          moduleId: tasksModule.id,
          permissions: ['read', 'write'],
          grantedById,
        }),
      );
    }

    if (timeTrackingModule) {
      await this.userModulePermissionRepository.save(
        this.userModulePermissionRepository.create({
          userId: employee.id,
          moduleId: timeTrackingModule.id,
          permissions: ['read', 'write'],
          grantedById,
        }),
      );
    }
  }

  private async seedClients(
    companyA: Company,
    ownerA: User,
  ) {
    this.logger.log('Seeding clients...');

    // Create field definitions for Company A
    const fieldDefinitionsA = [
      {
        name: 'industry',
        label: 'Branża',
        fieldType: CustomFieldType.TEXT,
        isRequired: false,
        companyId: companyA.id,
        displayOrder: 1,
        createdById: ownerA.id,
      },
      {
        name: 'contract_value',
        label: 'Wartość kontraktu',
        fieldType: CustomFieldType.NUMBER,
        isRequired: false,
        companyId: companyA.id,
        displayOrder: 2,
        createdById: ownerA.id,
      },
      {
        name: 'contract_start',
        label: 'Data rozpoczęcia',
        fieldType: CustomFieldType.DATE,
        isRequired: false,
        companyId: companyA.id,
        displayOrder: 3,
        createdById: ownerA.id,
      },
      {
        name: 'is_vip',
        label: 'Klient VIP',
        fieldType: CustomFieldType.BOOLEAN,
        isRequired: false,
        companyId: companyA.id,
        displayOrder: 4,
        createdById: ownerA.id,
      },
    ];

    for (const fieldDef of fieldDefinitionsA) {
      await this.fieldDefinitionRepository.save(
        this.fieldDefinitionRepository.create(fieldDef),
      );
    }

    // Create clients for Company A
    const clientsA = [
      {
        name: 'Tech Solutions Sp. z o.o.',
        nip: '1234567890',
        email: 'kontakt@techsolutions.pl',
        phone: '+48 123 456 789',
        companyStartDate: new Date('2020-01-15'),
        cooperationStartDate: new Date('2023-03-01'),
        companySpecificity: 'Firma IT specjalizująca się w rozwiązaniach chmurowych',
        employmentType: EmploymentType.DG,
        vatStatus: VatStatus.VAT_MONTHLY,
        taxScheme: TaxScheme.PIT_19,
        zusStatus: ZusStatus.FULL,
        companyId: companyA.id,
        createdById: ownerA.id,
      },
      {
        name: 'Marketing Pro',
        nip: '9876543210',
        email: 'biuro@marketingpro.pl',
        phone: '+48 987 654 321',
        companyStartDate: new Date('2019-06-20'),
        cooperationStartDate: new Date('2022-11-15'),
        companySpecificity: 'Agencja marketingu cyfrowego',
        employmentType: EmploymentType.DG_ETAT,
        vatStatus: VatStatus.VAT_QUARTERLY,
        taxScheme: TaxScheme.LUMP_SUM,
        zusStatus: ZusStatus.PREFERENTIAL,
        companyId: companyA.id,
        createdById: ownerA.id,
      },
      {
        name: 'Jan Kowalski - Doradztwo',
        nip: '5555555555',
        email: 'jan.kowalski@doradztwo.pl',
        phone: '+48 555 555 555',
        companyStartDate: new Date('2021-09-01'),
        cooperationStartDate: new Date('2024-01-10'),
        companySpecificity: 'Doradztwo biznesowe dla małych firm',
        employmentType: EmploymentType.DG_HALF_TIME_BELOW_MIN,
        vatStatus: VatStatus.NO,
        taxScheme: TaxScheme.GENERAL,
        zusStatus: ZusStatus.NONE,
        companyId: companyA.id,
        createdById: ownerA.id,
      },
    ];

    for (const client of clientsA) {
      await this.clientRepository.save(this.clientRepository.create(client));
    }

    this.logger.log('Clients seeded successfully');
  }

  private async seedEmailConfigurations(
    companyA: Company,
    _ownerA: User,
    _employeesA: User[],
  ) {
    this.logger.log('Seeding email configurations...');

    // Company-wide email configuration (used by Email Client module)
    // Credentials are read from environment variables for security
    const companyEmailConfig = {
      smtpHost: 'smtp.poczta.onet.pl',
      smtpPort: 465,
      smtpSecure: true,
      smtpUser: this.configService.get<string>('SEED_SMTP_USER', ''),
      smtpPassword: this.configService.get<string>('SEED_SMTP_PASSWORD', ''),
      imapHost: 'imap.poczta.onet.pl',
      imapPort: 993,
      imapTls: true,
      imapUser: this.configService.get<string>('SEED_IMAP_USER', ''),
      imapPassword: this.configService.get<string>('SEED_IMAP_PASSWORD', ''),
      displayName: 'Tech Startup A - Company Email',
    };

    try {
      // Create COMPANY email configuration (used by Email Client module)
      // Email Client uses getDecryptedEmailConfigByCompanyId() which queries by companyId
      await this.emailConfigService.createCompanyConfig(companyA.id, companyEmailConfig, true);
      this.logger.log('Company Email Config created for Tech Startup A (Onet)');

      this.logger.log('Email configurations seeded successfully');
      this.logger.warn('SMTP verification skipped for dev/test - verify credentials before sending emails');
    } catch (error) {
      this.logger.error('Error seeding email configurations', (error as Error).message);
      // Continue seeding even if email config fails (email config is optional)
    }
  }
}
