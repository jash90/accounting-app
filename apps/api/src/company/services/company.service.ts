import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, Company, Module as ModuleEntity, UserModulePermission, UserRole } from '@accounting/common';
import { CreateEmployeeDto } from '../dto/create-employee.dto';
import { UpdateEmployeeDto } from '../dto/update-employee.dto';
import { GrantModuleAccessDto } from '../dto/grant-module-access.dto';
import { RBACService } from '@accounting/rbac';

@Injectable()
export class CompanyService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
    @InjectRepository(ModuleEntity)
    private moduleRepository: Repository<ModuleEntity>,
    @InjectRepository(UserModulePermission)
    private userModulePermissionRepository: Repository<UserModulePermission>,
    private rbacService: RBACService,
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

  async createEmployee(companyId: string, createEmployeeDto: CreateEmployeeDto) {
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

    return this.userRepository.save(employee);
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

  // Module Management
  async getAvailableModules(companyId: string) {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return this.rbacService.getAvailableModules(company.ownerId);
  }

  async getModuleBySlug(companyId: string, slug: string) {
    const modules = await this.getAvailableModules(companyId);
    const module = modules.find((m) => m.slug === slug);

    if (!module) {
      throw new NotFoundException('Module not found or not available for your company');
    }

    return module;
  }

  // Employee Module Permissions
  async getEmployeeModules(companyId: string, employeeId: string) {
    await this.getEmployeeById(companyId, employeeId);

    const permissions = await this.userModulePermissionRepository.find({
      where: { userId: employeeId },
      relations: ['module'],
    });

    return permissions;
  }

  async grantModuleAccessToEmployee(
    companyId: string,
    employeeId: string,
    moduleSlug: string,
    grantModuleAccessDto: GrantModuleAccessDto,
  ) {
    const employee = await this.getEmployeeById(companyId, employeeId);
    const module = await this.getModuleBySlug(companyId, moduleSlug);

    // Check if company owner has access to this module
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
      relations: ['owner'],
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const ownerHasAccess = await this.rbacService.canAccessModule(company.ownerId, moduleSlug);
    if (!ownerHasAccess) {
      throw new ForbiddenException('You do not have access to this module');
    }

    let permission = await this.userModulePermissionRepository.findOne({
      where: {
        userId: employee.id,
        moduleId: module.id,
      },
    });

    if (permission) {
      permission.permissions = grantModuleAccessDto.permissions;
      permission.grantedById = company.ownerId;
    } else {
      permission = this.userModulePermissionRepository.create({
        userId: employee.id,
        moduleId: module.id,
        permissions: grantModuleAccessDto.permissions,
        grantedById: company.ownerId,
      });
    }

    return this.userModulePermissionRepository.save(permission);
  }

  async updateEmployeeModulePermissions(
    companyId: string,
    employeeId: string,
    moduleSlug: string,
    grantModuleAccessDto: GrantModuleAccessDto,
  ) {
    return this.grantModuleAccessToEmployee(companyId, employeeId, moduleSlug, grantModuleAccessDto);
  }

  async revokeModuleAccessFromEmployee(companyId: string, employeeId: string, moduleSlug: string) {
    const employee = await this.getEmployeeById(companyId, employeeId);
    const module = await this.getModuleBySlug(companyId, moduleSlug);

    const permission = await this.userModulePermissionRepository.findOne({
      where: {
        userId: employee.id,
        moduleId: module.id,
      },
    });

    if (permission) {
      await this.userModulePermissionRepository.remove(permission);
    }

    return { message: 'Module access revoked successfully' };
  }
}

