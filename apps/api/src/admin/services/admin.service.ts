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
}

