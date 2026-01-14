import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import {
  User,
  Company,
  Module as ModuleEntity,
  CompanyModuleAccess,
  UserModulePermission,
  SimpleText,
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

@Injectable()
export class SeederService {
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
    @InjectRepository(SimpleText)
    private simpleTextRepository: Repository<SimpleText>,
    @InjectRepository(Client)
    private clientRepository: Repository<Client>,
    @InjectRepository(ClientFieldDefinition)
    private fieldDefinitionRepository: Repository<ClientFieldDefinition>,
    private dataSource: DataSource,
    private emailConfigService: EmailConfigurationService,
  ) {}

  async seed() {
    console.log('Starting database seeding...');

    // Clear existing data
    await this.clearDatabase();

    // Seed data in correct order
    const admin = await this.seedAdmin();
    const _systemCompany = await this.seedSystemAdminCompany(admin);
    const { companyA, ownerA, employeesA } = await this.seedCompanyA();
    await this.seedEmailConfigurations(companyA, ownerA, employeesA);
    const modules = await this.seedModules();
    await this.seedModuleAccess(companyA, modules);
    await this.seedEmployeePermissions(employeesA, modules);
    await this.seedSimpleTexts(companyA, ownerA, employeesA);
    await this.seedClients(companyA, ownerA);

    console.log('Database seeding completed!');
    console.log('\nTest Users:');
    console.log('Admin: admin@system.com / Admin123!');
    console.log('Company A Owner: bartlomiej.zimny@onet.pl / Owner123!');
    console.log('Company A Employee: bartlomiej.zimny@interia.pl / Employee123!');
  }

  private async clearDatabase() {
    // Use TRUNCATE with CASCADE to efficiently clear all tables
    // This handles foreign key constraints automatically
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      await queryRunner.query('TRUNCATE TABLE ai_messages, ai_conversations, ai_contexts, ai_configurations, token_usages, token_limits, simple_texts, user_module_permissions, company_module_access, modules, client_icon_assignments, client_icons, client_custom_field_values, client_field_definitions, notification_settings, change_logs, clients, users, companies RESTART IDENTITY CASCADE');
    } finally {
      await queryRunner.release();
    }
  }

  private async seedAdmin() {
    const hashedPassword = await bcrypt.hash('Admin123!', 10);
    const admin = this.userRepository.create({
      email: 'admin@system.com'.toLowerCase(),
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
    console.log('Creating System Admin company...');
    const systemCompany = this.companyRepository.create({
      name: 'System Admin',
      ownerId: admin.id,
      isSystemCompany: true,
      isActive: true,
    });
    const savedCompany = await this.companyRepository.save(systemCompany);
    console.log('✅ System Admin company created');
    return savedCompany;
  }

  private async seedCompanyA() {
    const hashedPassword = await bcrypt.hash('Owner123!', 10);
    const ownerA = this.userRepository.create({
      email: 'bartlomiej.zimny@onet.pl'.toLowerCase(),
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

    const employee1Password = await bcrypt.hash('Employee123!', 10);
    const employee1 = this.userRepository.create({
      email: 'bartlomiej.zimny@interia.pl'.toLowerCase(),
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

  private async seedModules() {
    const modules = [
      {
        name: 'Simple Text',
        slug: 'simple-text',
        description: 'Basic text management',
        isActive: true,
      },
      {
        name: 'AI Agent',
        slug: 'ai-agent',
        description: 'AI-powered chat assistant with RAG and token management',
        isActive: true,
      },
      {
        name: 'Clients',
        slug: 'clients',
        description: 'Client management with custom fields, icons, and change tracking',
        isActive: true,
      },
    ];

    const savedModules = [];
    for (const module of modules) {
      const saved = await this.moduleRepository.save(this.moduleRepository.create(module));
      savedModules.push(saved);
    }

    return savedModules;
  }

  private async seedModuleAccess(
    companyA: Company,
    modules: ModuleEntity[],
  ) {
    // Company A: simple-text, ai-agent, clients
    const simpleTextModule = modules.find((m) => m.slug === 'simple-text');
    const aiAgentModule = modules.find((m) => m.slug === 'ai-agent');
    const clientsModule = modules.find((m) => m.slug === 'clients');

    if (simpleTextModule) {
      await this.companyModuleAccessRepository.save(
        this.companyModuleAccessRepository.create({
          companyId: companyA.id,
          moduleId: simpleTextModule.id,
          isEnabled: true,
        }),
      );
    }

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
  }

  private async seedEmployeePermissions(
    employeesA: User[],
    modules: ModuleEntity[],
  ) {
    const simpleTextModule = modules.find((m) => m.slug === 'simple-text');
    const aiAgentModule = modules.find((m) => m.slug === 'ai-agent');
    const clientsModule = modules.find((m) => m.slug === 'clients');

    // Employee 1A: read, write for all modules
    const employee = employeesA[0];
    if (!employee) return;

    if (simpleTextModule) {
      await this.userModulePermissionRepository.save(
        this.userModulePermissionRepository.create({
          userId: employee.id,
          moduleId: simpleTextModule.id,
          permissions: ['read', 'write'],
          grantedById: employee.companyId
            ? (await this.companyRepository.findOne({ where: { id: employee.companyId } }))
                ?.ownerId || ''
            : '',
        }),
      );
    }

    if (aiAgentModule) {
      await this.userModulePermissionRepository.save(
        this.userModulePermissionRepository.create({
          userId: employee.id,
          moduleId: aiAgentModule.id,
          permissions: ['read', 'write'],
          grantedById: employee.companyId
            ? (await this.companyRepository.findOne({ where: { id: employee.companyId } }))
                ?.ownerId || ''
            : '',
        }),
      );
    }

    if (clientsModule) {
      await this.userModulePermissionRepository.save(
        this.userModulePermissionRepository.create({
          userId: employee.id,
          moduleId: clientsModule.id,
          permissions: ['read', 'write'],
          grantedById: employee.companyId
            ? (await this.companyRepository.findOne({ where: { id: employee.companyId } }))
                ?.ownerId || ''
            : '',
        }),
      );
    }
  }

  private async seedSimpleTexts(
    companyA: Company,
    ownerA: User,
    _employeesA: User[],
  ) {
    const textsA = [
      'First text for Company A',
      'Second text for Company A',
      'Third text for Company A',
      'Fourth text for Company A',
      'Fifth text for Company A',
    ];

    for (const text of textsA) {
      await this.simpleTextRepository.save(
        this.simpleTextRepository.create({
          content: text,
          companyId: companyA.id,
          createdById: ownerA.id,
        }),
      );
    }
  }

  private async seedClients(
    companyA: Company,
    ownerA: User,
  ) {
    console.log('Seeding clients...');

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

    console.log('✅ Clients seeded successfully');
  }

  private async seedEmailConfigurations(
    companyA: Company,
    ownerA: User,
    employeesA: User[],
  ) {
    console.log('Seeding email configurations...');

    // Onet configuration for owner
    const onetConfig = {
      smtpHost: 'smtp.poczta.onet.pl',
      smtpPort: 465,
      smtpSecure: true,
      smtpUser: 'bartlomiej.zimny@onet.pl',
      smtpPassword: 'jN%450ve*E0^aU7!Pk%9',
      imapHost: 'imap.poczta.onet.pl',
      imapPort: 993,
      imapTls: true,
      imapUser: 'bartlomiej.zimny@onet.pl',
      imapPassword: 'jN%450ve*E0^aU7!Pk%9',
      displayName: 'Company Owner Email (Onet)',
    };

    // Interia configuration for employee
    const interiaConfig = {
      smtpHost: 'poczta.interia.pl',
      smtpPort: 465,
      smtpSecure: true,
      smtpUser: 'bartlomiej.zimny@interia.pl',
      smtpPassword: 'ZnJaTbDJbJA2hFQyHPG!',
      imapHost: 'poczta.interia.pl',
      imapPort: 993,
      imapTls: true,
      imapUser: 'bartlomiej.zimny@interia.pl',
      imapPassword: 'ZnJaTbDJbJA2hFQyHPG!',
      displayName: 'Employee Email (Interia)',
    };

    try {
      // Create email configuration for owner (Onet) - skip verification for seeder
      await this.emailConfigService.createUserConfig(ownerA.id, onetConfig, true);
      console.log(`✅ Email config created for Company A Owner`);

      // Create email configuration for employee (Interia) - skip verification for seeder
      if (employeesA[0]) {
        await this.emailConfigService.createUserConfig(employeesA[0].id, interiaConfig, true);
        console.log(`✅ Email config created for Company A Employee`);
      }

      console.log('✅ Email configurations seeded successfully');
      console.log('⚠️  SMTP verification skipped for dev/test - verify credentials before sending emails');
    } catch (error) {
      console.error('❌ Error seeding email configurations:', error.message);
      // Continue seeding even if email config fails (email config is optional)
    }
  }
}
