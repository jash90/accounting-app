import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import * as bcrypt from 'bcryptjs';
import { DataSource, Repository } from 'typeorm';

import { Company, User, UserRole } from '@accounting/common';
import { RBACService } from '@accounting/rbac';

import { CreateCompanyDto } from '../dto/create-company.dto';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateCompanyDto } from '../dto/update-company.dto';
import { UpdateUserDto } from '../dto/update-user.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
    private rbacService: RBACService,
    private dataSource: DataSource
  ) {}

  private async getSystemCompany(): Promise<Company> {
    const systemCompany = await this.companyRepository.findOne({
      where: { isSystemCompany: true },
    });

    if (!systemCompany) {
      throw new Error('System Admin company not found. Please run migrations.');
    }

    return systemCompany;
  }

  // User Management
  async findAllUsers() {
    return this.userRepository.find({
      relations: ['company'],
      order: { createdAt: 'DESC' },
    });
  }

  async findUserById(id: string) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['company'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async createUser(createUserDto: CreateUserDto) {
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Auto-assign ADMIN users to System Admin company
    if (createUserDto.role === UserRole.ADMIN) {
      const systemCompany = await this.getSystemCompany();
      createUserDto.companyId = systemCompany.id;
    }

    // EMPLOYEE requires companyId
    if (createUserDto.role === UserRole.EMPLOYEE && !createUserDto.companyId) {
      throw new BadRequestException('companyId is required for EMPLOYEE role');
    }

    // COMPANY_OWNER requires companyName (to auto-create company)
    if (createUserDto.role === UserRole.COMPANY_OWNER && !createUserDto.companyName) {
      throw new BadRequestException('companyName is required for COMPANY_OWNER role');
    }

    if (createUserDto.companyId) {
      const company = await this.companyRepository.findOne({
        where: { id: createUserDto.companyId },
      });
      if (!company) {
        throw new NotFoundException('Company not found');
      }
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    // Use transaction to ensure atomic creation of user and company for COMPANY_OWNER
    return this.dataSource.transaction(async (manager) => {
      const user = manager.create(User, {
        ...createUserDto,
        password: hashedPassword,
        isActive: createUserDto.isActive ?? true,
      });

      const savedUser = await manager.save(user);

      // If COMPANY_OWNER and companyName provided, auto-create company within same transaction
      if (createUserDto.role === UserRole.COMPANY_OWNER && createUserDto.companyName) {
        const company = manager.create(Company, {
          name: createUserDto.companyName,
          ownerId: savedUser.id,
        });
        const savedCompany = await manager.save(company);
        savedUser.companyId = savedCompany.id;
        await manager.save(savedUser);
      }

      return savedUser;
    });
  }

  async updateUser(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.findUserById(id);

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: updateUserDto.email },
      });
      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }
    }

    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    // Auto-assign to System Admin company when promoting to ADMIN role
    if (updateUserDto.role === UserRole.ADMIN) {
      const systemCompany = await this.getSystemCompany();
      updateUserDto.companyId = systemCompany.id;
    }

    Object.assign(user, updateUserDto);
    return this.userRepository.save(user);
  }

  async deleteUser(id: string) {
    const user = await this.findUserById(id);
    user.isActive = false;
    return this.userRepository.save(user);
  }

  async activateUser(id: string, isActive: boolean) {
    const user = await this.findUserById(id);
    user.isActive = isActive;
    return this.userRepository.save(user);
  }

  // Get available owners (COMPANY_OWNER without assigned company)
  async findAvailableOwners() {
    return this.userRepository.find({
      where: {
        role: UserRole.COMPANY_OWNER,
        companyId: null as unknown as string, // TypeORM requires this cast for null comparison
        isActive: true,
      },
      order: { createdAt: 'DESC' },
    });
  }

  // Company Management
  async findAllCompanies() {
    return this.companyRepository.find({
      where: { isSystemCompany: false }, // Hide System Admin company from list
      relations: ['owner', 'employees'],
      order: { createdAt: 'DESC' },
    });
  }

  async findCompanyById(id: string) {
    const company = await this.companyRepository.findOne({
      where: { id },
      relations: ['owner', 'employees'],
    });

    if (!company) {
      throw new NotFoundException(`Company with ID ${id} not found`);
    }

    return company;
  }

  async createCompany(createCompanyDto: CreateCompanyDto) {
    // Initial validation outside transaction
    const ownerCheck = await this.userRepository.findOne({
      where: { id: createCompanyDto.ownerId },
    });

    if (!ownerCheck) {
      throw new NotFoundException('Owner user not found');
    }

    if (ownerCheck.role !== UserRole.COMPANY_OWNER) {
      throw new BadRequestException('Owner must have COMPANY_OWNER role');
    }

    // Use transaction with pessimistic lock to prevent race conditions
    return this.dataSource.transaction(async (manager) => {
      // Acquire pessimistic write lock on the owner row and re-check companyId
      const owner = await manager.findOne(User, {
        where: { id: createCompanyDto.ownerId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!owner) {
        throw new NotFoundException('Owner user not found');
      }

      // Re-check if owner already has a company assigned (within lock)
      if (owner.companyId) {
        throw new BadRequestException('This owner is already assigned to another company');
      }

      // Create and save company within transaction
      const company = manager.create(Company, {
        name: createCompanyDto.name,
        ownerId: createCompanyDto.ownerId,
      });

      const savedCompany = await manager.save(company);

      // Auto-assign the owner to the newly created company within same transaction
      owner.companyId = savedCompany.id;
      await manager.save(owner);

      return savedCompany;
    });
  }

  async updateCompany(id: string, updateCompanyDto: UpdateCompanyDto) {
    const company = await this.findCompanyById(id);
    Object.assign(company, updateCompanyDto);
    return this.companyRepository.save(company);
  }

  async deleteCompany(id: string) {
    const company = await this.findCompanyById(id);

    // Prevent deletion of System Admin company
    if (company.isSystemCompany) {
      throw new BadRequestException('Cannot delete System Admin company');
    }

    company.isActive = false;
    return this.companyRepository.save(company);
  }

  async getCompanyEmployees(companyId: string) {
    const company = await this.findCompanyById(companyId);
    return company.employees;
  }
}
