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
  ) {}

  async seed() {
    console.log('Starting database seeding...');

    // Clear existing data
    await this.clearDatabase();

    // Seed data in correct order
    const admin = await this.seedAdmin();
    const systemCompany = await this.seedSystemAdminCompany(admin);
    const { companyA, ownerA, employeesA } = await this.seedCompanyA();
    const { companyB, ownerB, employeesB } = await this.seedCompanyB();
    const modules = await this.seedModules();
    await this.seedModuleAccess(companyA, companyB, modules);
    await this.seedEmployeePermissions(employeesA, employeesB, modules);
    await this.seedSimpleTexts(companyA, companyB, ownerA, ownerB, employeesA);
    await this.seedClients(companyA, companyB, ownerA, ownerB);

    console.log('Database seeding completed!');
    console.log('\nTest Users:');
    console.log('Admin: admin@system.com / Admin123!');
    console.log('Company A Owner: owner.a@company.com / Owner123!');
    console.log('Company A Employee 1: employee1.a@company.com / Employee123!');
    console.log('Company A Employee 2: employee2.a@company.com / Employee123!');
    console.log('Company B Owner: owner.b@company.com / Owner123!');
    console.log('Company B Employee 1: employee1.b@company.com / Employee123!');
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
      email: 'owner.a@company.com'.toLowerCase(),
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
      email: 'employee1.a@company.com'.toLowerCase(),
      password: employee1Password,
      firstName: 'Employee',
      lastName: '1A',
      role: UserRole.EMPLOYEE,
      companyId: savedCompanyA.id,
      isActive: true,
    });
    const savedEmployee1 = await this.userRepository.save(employee1);

    const employee2Password = await bcrypt.hash('Employee123!', 10);
    const employee2 = this.userRepository.create({
      email: 'employee2.a@company.com'.toLowerCase(),
      password: employee2Password,
      firstName: 'Employee',
      lastName: '2A',
      role: UserRole.EMPLOYEE,
      companyId: savedCompanyA.id,
      isActive: true,
    });
    const savedEmployee2 = await this.userRepository.save(employee2);

    return {
      companyA: savedCompanyA,
      ownerA: savedOwnerA,
      employeesA: [savedEmployee1, savedEmployee2],
    };
  }

  private async seedCompanyB() {
    const hashedPassword = await bcrypt.hash('Owner123!', 10);
    const ownerB = this.userRepository.create({
      email: 'owner.b@company.com'.toLowerCase(),
      password: hashedPassword,
      firstName: 'Owner',
      lastName: 'B',
      role: UserRole.COMPANY_OWNER,
      isActive: true,
    });
    const savedOwnerB = await this.userRepository.save(ownerB);

    const companyB = this.companyRepository.create({
      name: 'Consulting B',
      ownerId: savedOwnerB.id,
      isActive: true,
    });
    const savedCompanyB = await this.companyRepository.save(companyB);

    savedOwnerB.companyId = savedCompanyB.id;
    await this.userRepository.save(savedOwnerB);

    const employee1Password = await bcrypt.hash('Employee123!', 10);
    const employee1 = this.userRepository.create({
      email: 'employee1.b@company.com'.toLowerCase(),
      password: employee1Password,
      firstName: 'Employee',
      lastName: '1B',
      role: UserRole.EMPLOYEE,
      companyId: savedCompanyB.id,
      isActive: true,
    });
    const savedEmployee1 = await this.userRepository.save(employee1);

    return {
      companyB: savedCompanyB,
      ownerB: savedOwnerB,
      employeesB: [savedEmployee1],
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
    companyB: Company,
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

    // Company B: simple-text, ai-agent, clients
    if (simpleTextModule) {
      await this.companyModuleAccessRepository.save(
        this.companyModuleAccessRepository.create({
          companyId: companyB.id,
          moduleId: simpleTextModule.id,
          isEnabled: true,
        }),
      );
    }

    if (aiAgentModule) {
      await this.companyModuleAccessRepository.save(
        this.companyModuleAccessRepository.create({
          companyId: companyB.id,
          moduleId: aiAgentModule.id,
          isEnabled: true,
        }),
      );
    }

    if (clientsModule) {
      await this.companyModuleAccessRepository.save(
        this.companyModuleAccessRepository.create({
          companyId: companyB.id,
          moduleId: clientsModule.id,
          isEnabled: true,
        }),
      );
    }
  }

  private async seedEmployeePermissions(
    employeesA: User[],
    employeesB: User[],
    modules: ModuleEntity[],
  ) {
    const simpleTextModule = modules.find((m) => m.slug === 'simple-text');
    const aiAgentModule = modules.find((m) => m.slug === 'ai-agent');
    const clientsModule = modules.find((m) => m.slug === 'clients');

    if (simpleTextModule) {
      // Employee 1A: read, write
      if (employeesA[0]) {
        await this.userModulePermissionRepository.save(
          this.userModulePermissionRepository.create({
            userId: employeesA[0].id,
            moduleId: simpleTextModule.id,
            permissions: ['read', 'write'],
            grantedById: employeesA[0].companyId
              ? (await this.companyRepository.findOne({ where: { id: employeesA[0].companyId } }))
                  ?.ownerId || ''
              : '',
          }),
        );
      }

      // Employee 2A: read
      if (employeesA[1]) {
        await this.userModulePermissionRepository.save(
          this.userModulePermissionRepository.create({
            userId: employeesA[1].id,
            moduleId: simpleTextModule.id,
            permissions: ['read'],
            grantedById: employeesA[1].companyId
              ? (await this.companyRepository.findOne({ where: { id: employeesA[1].companyId } }))
                  ?.ownerId || ''
              : '',
          }),
        );
      }

      // Employee 1B: read, write, delete
      if (employeesB[0]) {
        await this.userModulePermissionRepository.save(
          this.userModulePermissionRepository.create({
            userId: employeesB[0].id,
            moduleId: simpleTextModule.id,
            permissions: ['read', 'write', 'delete'],
            grantedById: employeesB[0].companyId
              ? (await this.companyRepository.findOne({ where: { id: employeesB[0].companyId } }))
                  ?.ownerId || ''
              : '',
          }),
        );
      }
    }

    // AI Agent Module Permissions
    if (aiAgentModule) {
      // Employee 1A: read, write (can chat)
      if (employeesA[0]) {
        await this.userModulePermissionRepository.save(
          this.userModulePermissionRepository.create({
            userId: employeesA[0].id,
            moduleId: aiAgentModule.id,
            permissions: ['read', 'write'],
            grantedById: employeesA[0].companyId
              ? (await this.companyRepository.findOne({ where: { id: employeesA[0].companyId } }))
                  ?.ownerId || ''
              : '',
          }),
        );
      }

      // Employee 2A: read, write (can chat)
      if (employeesA[1]) {
        await this.userModulePermissionRepository.save(
          this.userModulePermissionRepository.create({
            userId: employeesA[1].id,
            moduleId: aiAgentModule.id,
            permissions: ['read', 'write'],
            grantedById: employeesA[1].companyId
              ? (await this.companyRepository.findOne({ where: { id: employeesA[1].companyId } }))
                  ?.ownerId || ''
              : '',
          }),
        );
      }

      // Employee 1B: read, write, delete (full access)
      if (employeesB[0]) {
        await this.userModulePermissionRepository.save(
          this.userModulePermissionRepository.create({
            userId: employeesB[0].id,
            moduleId: aiAgentModule.id,
            permissions: ['read', 'write', 'delete'],
            grantedById: employeesB[0].companyId
              ? (await this.companyRepository.findOne({ where: { id: employeesB[0].companyId } }))
                  ?.ownerId || ''
              : '',
          }),
        );
      }
    }

    // Clients Module Permissions
    if (clientsModule) {
      // Employee 1A: read, write (can manage clients)
      if (employeesA[0]) {
        await this.userModulePermissionRepository.save(
          this.userModulePermissionRepository.create({
            userId: employeesA[0].id,
            moduleId: clientsModule.id,
            permissions: ['read', 'write'],
            grantedById: employeesA[0].companyId
              ? (await this.companyRepository.findOne({ where: { id: employeesA[0].companyId } }))
                  ?.ownerId || ''
              : '',
          }),
        );
      }

      // Employee 2A: read only
      if (employeesA[1]) {
        await this.userModulePermissionRepository.save(
          this.userModulePermissionRepository.create({
            userId: employeesA[1].id,
            moduleId: clientsModule.id,
            permissions: ['read'],
            grantedById: employeesA[1].companyId
              ? (await this.companyRepository.findOne({ where: { id: employeesA[1].companyId } }))
                  ?.ownerId || ''
              : '',
          }),
        );
      }

      // Employee 1B: read, write, delete (full access)
      if (employeesB[0]) {
        await this.userModulePermissionRepository.save(
          this.userModulePermissionRepository.create({
            userId: employeesB[0].id,
            moduleId: clientsModule.id,
            permissions: ['read', 'write', 'delete'],
            grantedById: employeesB[0].companyId
              ? (await this.companyRepository.findOne({ where: { id: employeesB[0].companyId } }))
                  ?.ownerId || ''
              : '',
          }),
        );
      }
    }
  }

  private async seedSimpleTexts(
    companyA: Company,
    companyB: Company,
    ownerA: User,
    ownerB: User,
    employeesA: User[],
  ) {
    const textsA = [
      'First text for Company A',
      'Second text for Company A',
      'Third text for Company A',
      'Fourth text for Company A',
      'Fifth text for Company A',
    ];

    const textsB = ['First text for Company B', 'Second text for Company B', 'Third text for Company B'];

    for (const text of textsA) {
      await this.simpleTextRepository.save(
        this.simpleTextRepository.create({
          content: text,
          companyId: companyA.id,
          createdById: ownerA.id,
        }),
      );
    }

    for (const text of textsB) {
      await this.simpleTextRepository.save(
        this.simpleTextRepository.create({
          content: text,
          companyId: companyB.id,
          createdById: ownerB.id,
        }),
      );
    }
  }

  private async seedClients(
    companyA: Company,
    companyB: Company,
    ownerA: User,
    ownerB: User,
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

    // Create clients for Company B
    const clientsB = [
      {
        name: 'Global Trade Ltd.',
        nip: '1111111111',
        email: 'info@globaltrade.com',
        phone: '+48 111 111 111',
        companyStartDate: new Date('2018-03-10'),
        cooperationStartDate: new Date('2023-06-01'),
        companySpecificity: 'Handel międzynarodowy',
        employmentType: EmploymentType.DG_AKCJONARIUSZ,
        vatStatus: VatStatus.VAT_MONTHLY,
        taxScheme: TaxScheme.PIT_17,
        zusStatus: ZusStatus.FULL,
        companyId: companyB.id,
        createdById: ownerB.id,
      },
      {
        name: 'Usługi Budowlane Nowak',
        nip: '2222222222',
        email: 'nowak@budowlane.pl',
        phone: '+48 222 222 222',
        companyStartDate: new Date('2015-07-15'),
        cooperationStartDate: new Date('2022-02-28'),
        companySpecificity: 'Roboty budowlane i remontowe',
        gtuCode: 'GTU_10',
        employmentType: EmploymentType.DG_HALF_TIME_ABOVE_MIN,
        vatStatus: VatStatus.NO_WATCH_LIMIT,
        taxScheme: TaxScheme.LUMP_SUM,
        zusStatus: ZusStatus.PREFERENTIAL,
        companyId: companyB.id,
        createdById: ownerB.id,
      },
    ];

    for (const client of clientsB) {
      await this.clientRepository.save(this.clientRepository.create(client));
    }

    console.log('✅ Clients seeded successfully');
  }
}

