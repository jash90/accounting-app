import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { applyUpdate, TaskLabel, User } from '@accounting/common';
import { SystemCompanyService } from '@accounting/common/backend';

import { CreateTaskLabelDto, UpdateTaskLabelDto } from '../dto/task-label.dto';
import { TaskLabelAlreadyExistsException, TaskLabelNotFoundException } from '../exceptions';

@Injectable()
export class TaskLabelsService {
  constructor(
    @InjectRepository(TaskLabel)
    private readonly labelRepository: Repository<TaskLabel>,
    private readonly systemCompanyService: SystemCompanyService
  ) {}

  async findAll(user: User): Promise<TaskLabel[]> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);

    return this.labelRepository.find({
      where: { companyId, isActive: true },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string, user: User): Promise<TaskLabel> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);

    const label = await this.labelRepository.findOne({
      where: { id, companyId },
    });

    if (!label) {
      throw new TaskLabelNotFoundException(id, companyId);
    }

    return label;
  }

  async create(dto: CreateTaskLabelDto, user: User): Promise<TaskLabel> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);

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
      const companyId = await this.systemCompanyService.getCompanyIdForUser(user);
      const existing = await this.labelRepository.findOne({
        where: { name: dto.name, companyId },
      });
      if (existing) {
        throw new TaskLabelAlreadyExistsException(dto.name, companyId);
      }
    }

    applyUpdate(label, dto, ['id', 'companyId', 'createdAt', 'updatedAt']);
    return this.labelRepository.save(label);
  }

  async softDeleteTaskLabel(id: string, user: User): Promise<void> {
    const label = await this.findOne(id, user);

    // Soft delete
    label.isActive = false;
    await this.labelRepository.save(label);
  }
}
