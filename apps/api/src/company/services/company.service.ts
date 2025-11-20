import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '@accounting/common';
import { CreateEmployeeDto } from '../dto/create-employee.dto';
import { UpdateEmployeeDto } from '../dto/update-employee.dto';

@Injectable()
export class CompanyService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
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
}

