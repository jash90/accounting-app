import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import {
  User,
  Company,
  Module as ModuleEntity,
  CompanyModuleAccess,
  UserRole,
} from '@accounting/common';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { CreateCompanyDto } from '../dto/create-company.dto';
import { UpdateCompanyDto } from '../dto/update-company.dto';
import { CreateModuleDto } from '../dto/create-module.dto';
import { RBACService } from '@accounting/rbac';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
    @InjectRepository(ModuleEntity)
    private moduleRepository: Repository<ModuleEntity>,
    @InjectRepository(CompanyModuleAccess)
    private companyModuleAccessRepository: Repository<CompanyModuleAccess>,
    private rbacService: RBACService,
  ) {}

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

    if (
      (createUserDto.role === UserRole.COMPANY_OWNER ||
        createUserDto.role === UserRole.EMPLOYEE) &&
      !createUserDto.companyId
    ) {
      throw new BadRequestException('companyId is required for COMPANY_OWNER and EMPLOYEE roles');
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

    return this.userRepository.save(user);
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

  // Company Management
  async findAllCompanies() {
    return this.companyRepository.find({
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

    const company = this.companyRepository.create({
      name: createCompanyDto.name,
      ownerId: createCompanyDto.ownerId,
    });

    return this.companyRepository.save(company);
  }

  async updateCompany(id: string, updateCompanyDto: UpdateCompanyDto) {
    const company = await this.findCompanyById(id);
    Object.assign(company, updateCompanyDto);
    return this.companyRepository.save(company);
  }

  async deleteCompany(id: string) {
    const company = await this.findCompanyById(id);
    company.isActive = false;
    return this.companyRepository.save(company);
  }

  async getCompanyEmployees(companyId: string) {
    const company = await this.findCompanyById(companyId);
    return company.employees;
  }

  // Module Management
  async findAllModules() {
    return this.moduleRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findModuleById(id: string) {
    const module = await this.moduleRepository.findOne({
      where: { id },
    });

    if (!module) {
      throw new NotFoundException(`Module with ID ${id} not found`);
    }

    return module;
  }

  async createModule(createModuleDto: CreateModuleDto) {
    const existingModule = await this.moduleRepository.findOne({
      where: { slug: createModuleDto.slug },
    });

    if (existingModule) {
      throw new ConflictException('Module with this slug already exists');
    }

    const module = this.moduleRepository.create(createModuleDto);
    return this.moduleRepository.save(module);
  }

  async updateModule(id: string, updateModuleDto: Partial<CreateModuleDto>) {
    const module = await this.findModuleById(id);
    Object.assign(module, updateModuleDto);
    return this.moduleRepository.save(module);
  }

  // Company Module Access Management
  async getCompanyModules(companyId: string) {
    const company = await this.findCompanyById(companyId);
    return this.companyModuleAccessRepository.find({
      where: { companyId: company.id },
      relations: ['module'],
    });
  }

  async grantModuleToCompany(companyId: string, moduleId: string) {
    const company = await this.findCompanyById(companyId);
    const module = await this.findModuleById(moduleId);

    let access = await this.companyModuleAccessRepository.findOne({
      where: { companyId: company.id, moduleId: module.id },
    });

    if (access) {
      access.isEnabled = true;
    } else {
      access = this.companyModuleAccessRepository.create({
        companyId: company.id,
        moduleId: module.id,
        isEnabled: true,
      });
    }

    return this.companyModuleAccessRepository.save(access);
  }

  async revokeModuleFromCompany(companyId: string, moduleId: string) {
    const company = await this.findCompanyById(companyId);
    const module = await this.findModuleById(moduleId);

    const access = await this.companyModuleAccessRepository.findOne({
      where: { companyId: company.id, moduleId: module.id },
    });

    if (access) {
      access.isEnabled = false;
      return this.companyModuleAccessRepository.save(access);
    }

    throw new NotFoundException('Module access not found');
  }
}

