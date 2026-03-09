import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { ILike, IsNull, Repository } from 'typeorm';

import {
  escapeLikePattern,
  PaginatedResponseDto,
  Task,
  TaskStatus,
  User,
} from '@accounting/common';
import { calculatePagination, TenantService } from '@accounting/common/backend';

import {
  CreateTaskTemplateDto,
  TaskTemplateFiltersDto,
  UpdateTaskTemplateDto,
} from '../dto/task-template.dto';

@Injectable()
export class TaskTemplateService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    private readonly tenantService: TenantService
  ) {}

  async findAll(user: User, filters?: TaskTemplateFiltersDto): Promise<PaginatedResponseDto<Task>> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);
    const { page, limit, skip } = calculatePagination(filters);

    const where: Record<string, unknown> = {
      companyId,
      isTemplate: true,
      isActive: true,
      parentTaskId: IsNull(),
    };

    if (filters?.search) {
      where['title'] = ILike(`%${escapeLikePattern(filters.search)}%`);
    }

    const [templates, total] = await this.taskRepository.findAndCount({
      where,
      relations: ['assignee', 'client'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return new PaginatedResponseDto(templates, total, page, limit);
  }

  async findOne(id: string, user: User): Promise<Task> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);
    const template = await this.taskRepository.findOne({
      where: { id, companyId, isTemplate: true },
      relations: ['assignee', 'client'],
    });

    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }

    return template;
  }

  async create(dto: CreateTaskTemplateDto, user: User): Promise<Task> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    const template = this.taskRepository.create({
      title: dto.title,
      description: dto.description,
      priority: dto.priority,
      assigneeId: dto.assigneeId,
      clientId: dto.clientId,
      estimatedMinutes: dto.estimatedMinutes,
      recurrencePattern: dto.recurrencePattern ?? null,
      recurrenceEndDate: dto.recurrenceEndDate ? new Date(dto.recurrenceEndDate) : null,
      companyId,
      createdById: user.id,
      isTemplate: true,
      status: TaskStatus.TODO,
      sortOrder: 0,
    });

    return this.taskRepository.save(template);
  }

  async update(id: string, dto: UpdateTaskTemplateDto, user: User): Promise<Task> {
    const template = await this.findOne(id, user);

    if (dto.title !== undefined) template.title = dto.title;
    if (dto.description !== undefined) template.description = dto.description;
    if (dto.priority !== undefined) template.priority = dto.priority;
    if (dto.assigneeId !== undefined) template.assigneeId = dto.assigneeId;
    if (dto.clientId !== undefined) template.clientId = dto.clientId;
    if (dto.estimatedMinutes !== undefined) template.estimatedMinutes = dto.estimatedMinutes;
    if (dto.recurrencePattern !== undefined) template.recurrencePattern = dto.recurrencePattern;
    if (dto.recurrenceEndDate !== undefined) {
      template.recurrenceEndDate = dto.recurrenceEndDate ? new Date(dto.recurrenceEndDate) : null;
    }

    return this.taskRepository.save(template);
  }

  async softDeleteTaskTemplate(id: string, user: User): Promise<void> {
    const template = await this.findOne(id, user);
    template.isActive = false;
    await this.taskRepository.save(template);
  }

  /**
   * Creates a real task from a template (preserving the template reference).
   */
  async createTaskFromTemplate(templateId: string, user: User): Promise<Task> {
    const template = await this.findOne(templateId, user);
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    const task = this.taskRepository.create({
      title: template.title,
      description: template.description,
      priority: template.priority,
      assigneeId: template.assigneeId,
      clientId: template.clientId,
      estimatedMinutes: template.estimatedMinutes,
      companyId,
      createdById: user.id,
      isTemplate: false,
      status: TaskStatus.TODO,
      sortOrder: 0,
      templateId: template.id,
    });

    return this.taskRepository.save(task);
  }
}
