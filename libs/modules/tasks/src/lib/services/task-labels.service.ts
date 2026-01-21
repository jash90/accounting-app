import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { TaskLabel, User } from '@accounting/common';
import { TenantService } from '@accounting/common/backend';

import { CreateTaskLabelDto, UpdateTaskLabelDto } from '../dto/task-label.dto';
import { TaskLabelNotFoundException, TaskLabelAlreadyExistsException } from '../exceptions';

@Injectable()
export class TaskLabelsService {
  constructor(
    @InjectRepository(TaskLabel)
    private readonly labelRepository: Repository<TaskLabel>,
    private readonly tenantService: TenantService
  ) {}

  async findAll(user: User): Promise<TaskLabel[]> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    return this.labelRepository.find({
      where: { companyId, isActive: true },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string, user: User): Promise<TaskLabel> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    const label = await this.labelRepository.findOne({
      where: { id, companyId },
    });

    if (!label) {
      throw new TaskLabelNotFoundException(id, companyId);
    }

    return label;
  }

  async create(dto: CreateTaskLabelDto, user: User): Promise<TaskLabel> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    // Check for duplicate name
    const existing = await this.labelRepository.findOne({
      where: { name: dto.name, companyId },
    });
    if (existing) {
      throw new TaskLabelAlreadyExistsException(dto.name, companyId);
    }

    const label = this.labelRepository.create({
      ...dto,
      companyId,
      createdById: user.id,
    });

    return this.labelRepository.save(label);
  }

  async update(id: string, dto: UpdateTaskLabelDto, user: User): Promise<TaskLabel> {
    const label = await this.findOne(id, user);

    // Check for duplicate name if changing
    if (dto.name && dto.name !== label.name) {
      const companyId = await this.tenantService.getEffectiveCompanyId(user);
      const existing = await this.labelRepository.findOne({
        where: { name: dto.name, companyId },
      });
      if (existing) {
        throw new TaskLabelAlreadyExistsException(dto.name, companyId);
      }
    }

    Object.assign(label, dto);
    return this.labelRepository.save(label);
  }

  async remove(id: string, user: User): Promise<void> {
    const label = await this.findOne(id, user);

    // Soft delete
    label.isActive = false;
    await this.labelRepository.save(label);
  }
}
