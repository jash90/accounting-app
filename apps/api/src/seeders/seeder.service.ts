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
    private dataSource: DataSource,
  ) {}

  async seed() {
    console.log('Starting database seeding...');

    // Clear existing data
    await this.clearDatabase();

    // Seed data
    const admin = await this.seedAdmin();
    const { companyA, ownerA, employeesA } = await this.seedCompanyA();
    const { companyB, ownerB, employeesB } = await this.seedCompanyB();
    const modules = await this.seedModules();
    await this.seedModuleAccess(companyA, companyB, modules);
    await this.seedEmployeePermissions(employeesA, employeesB, modules);
    await this.seedSimpleTexts(companyA, companyB, ownerA, ownerB, employeesA);

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
      await queryRunner.query('TRUNCATE TABLE simple_texts, user_module_permissions, company_module_access, modules, users, companies RESTART IDENTITY CASCADE');
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
        name: 'Tasks',
        slug: 'tasks',
        description: 'Task management module (placeholder)',
        isActive: true,
      },
      {
        name: 'Reports',
        slug: 'reports',
        description: 'Reporting module (placeholder)',
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
    // Company A: simple-text, tasks
    const simpleTextModule = modules.find((m) => m.slug === 'simple-text');
    const tasksModule = modules.find((m) => m.slug === 'tasks');

    if (simpleTextModule) {
      await this.companyModuleAccessRepository.save(
        this.companyModuleAccessRepository.create({
          companyId: companyA.id,
          moduleId: simpleTextModule.id,
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

    // Company B: simple-text
    if (simpleTextModule) {
      await this.companyModuleAccessRepository.save(
        this.companyModuleAccessRepository.create({
          companyId: companyB.id,
          moduleId: simpleTextModule.id,
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
}

