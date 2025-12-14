import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import {
  User,
  Company,
  UserRole,
} from '@accounting/common';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { CreateCompanyDto } from '../dto/create-company.dto';
import { UpdateCompanyDto } from '../dto/update-company.dto';
import { RBACService } from '@accounting/rbac';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
    private rbacService: RBACService,
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

    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
      isActive: createUserDto.isActive ?? true,
    });

    const savedUser = await this.userRepository.save(user);

    // If COMPANY_OWNER and companyName provided, auto-create company
    if (createUserDto.role === UserRole.COMPANY_OWNER && createUserDto.companyName) {
      const company = this.companyRepository.create({
        name: createUserDto.companyName,
        ownerId: savedUser.id,
      });
      const savedCompany = await this.companyRepository.save(company);
      savedUser.companyId = savedCompany.id;
      await this.userRepository.save(savedUser);
    }

    return savedUser;
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
    const owner = await this.userRepository.findOne({
      where: { id: createCompanyDto.ownerId },
    });

    if (!owner) {
      throw new NotFoundException('Owner user not found');
    }

    if (owner.role !== UserRole.COMPANY_OWNER) {
      throw new BadRequestException('Owner must have COMPANY_OWNER role');
    }

    // Check if owner already has a company assigned
    if (owner.companyId) {
      throw new BadRequestException('This owner is already assigned to another company');
    }

    const company = this.companyRepository.create({
      name: createCompanyDto.name,
      ownerId: createCompanyDto.ownerId,
    });

    const savedCompany = await this.companyRepository.save(company);

    // Auto-assign the owner to the newly created company
    owner.companyId = savedCompany.id;
    await this.userRepository.save(owner);

    return savedCompany;
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

