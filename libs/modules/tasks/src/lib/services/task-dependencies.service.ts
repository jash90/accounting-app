import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Task,
  TaskDependency,
  User,
  TenantService,
} from '@accounting/common';
import {
  TaskNotFoundException,
  TaskDependencyNotFoundException,
  TaskDependencyCycleException,
  TaskSelfDependencyException,
  TaskDependencyAlreadyExistsException,
} from '../exceptions';
import { CreateTaskDependencyDto } from '../dto/task-dependency.dto';

@Injectable()
export class TaskDependenciesService {
  private readonly logger = new Logger(TaskDependenciesService.name);

  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(TaskDependency)
    private readonly dependencyRepository: Repository<TaskDependency>,
    private readonly tenantService: TenantService,
  ) {}

  async findAllForTask(taskId: string, user: User): Promise<TaskDependency[]> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    // Verify task exists
    const task = await this.taskRepository.findOne({
      where: { id: taskId, companyId },
    });
    if (!task) {
      throw new TaskNotFoundException(taskId, companyId);
    }

    return this.dependencyRepository.find({
      where: { taskId },
      relations: ['dependsOnTask', 'dependsOnTask.assignee'],
      order: { createdAt: 'ASC' },
    });
  }

  async findBlockedBy(taskId: string, user: User): Promise<TaskDependency[]> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    const task = await this.taskRepository.findOne({
      where: { id: taskId, companyId },
    });
    if (!task) {
      throw new TaskNotFoundException(taskId, companyId);
    }

    return this.dependencyRepository.find({
      where: { taskId },
      relations: ['dependsOnTask'],
    });
  }

  async findBlocking(taskId: string, user: User): Promise<TaskDependency[]> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    const task = await this.taskRepository.findOne({
      where: { id: taskId, companyId },
    });
    if (!task) {
      throw new TaskNotFoundException(taskId, companyId);
    }

    return this.dependencyRepository.find({
      where: { dependsOnTaskId: taskId },
      relations: ['task'],
    });
  }

  async create(taskId: string, dto: CreateTaskDependencyDto, user: User): Promise<TaskDependency> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    // Prevent self-dependency
    if (taskId === dto.dependsOnTaskId) {
      throw new TaskSelfDependencyException(taskId);
    }

    // Verify both tasks exist
    const task = await this.taskRepository.findOne({
      where: { id: taskId, companyId },
    });
    if (!task) {
      throw new TaskNotFoundException(taskId, companyId);
    }

    const dependsOnTask = await this.taskRepository.findOne({
      where: { id: dto.dependsOnTaskId, companyId },
    });
    if (!dependsOnTask) {
      throw new TaskNotFoundException(dto.dependsOnTaskId, companyId);
    }

    // Check if dependency already exists
    const existing = await this.dependencyRepository.findOne({
      where: { taskId, dependsOnTaskId: dto.dependsOnTaskId },
    });
    if (existing) {
      throw new TaskDependencyAlreadyExistsException(taskId, dto.dependsOnTaskId);
    }

    // Check for cycles
    if (await this.wouldCreateCycle(taskId, dto.dependsOnTaskId)) {
      throw new TaskDependencyCycleException(taskId, dto.dependsOnTaskId);
    }

    const dependency = this.dependencyRepository.create({
      taskId,
      dependsOnTaskId: dto.dependsOnTaskId,
      dependencyType: dto.dependencyType,
      createdById: user.id,
    });

    const saved = await this.dependencyRepository.save(dependency);

    return this.dependencyRepository.findOne({
      where: { id: saved.id },
      relations: ['dependsOnTask', 'dependsOnTask.assignee'],
    }) as Promise<TaskDependency>;
  }

  async remove(dependencyId: string, user: User): Promise<void> {
    const dependency = await this.dependencyRepository.findOne({
      where: { id: dependencyId },
      relations: ['task'],
    });

    if (!dependency) {
      throw new TaskDependencyNotFoundException(dependencyId);
    }

    // Verify user has access to the task's company
    const companyId = await this.tenantService.getEffectiveCompanyId(user);
    if (dependency.task?.companyId !== companyId) {
      throw new TaskDependencyNotFoundException(dependencyId);
    }

    await this.dependencyRepository.remove(dependency);
  }

  /**
   * Check if adding a dependency would create a cycle using DFS
   */
  private async wouldCreateCycle(taskId: string, dependsOnTaskId: string): Promise<boolean> {
    // If adding this dependency, taskId would depend on dependsOnTaskId
    // A cycle exists if dependsOnTaskId (directly or transitively) depends on taskId

    const visited = new Set<string>();
    const stack = [dependsOnTaskId];

    while (stack.length > 0) {
      const current = stack.pop()!;

      if (current === taskId) {
        return true; // Found a cycle
      }

      if (visited.has(current)) {
        continue;
      }
      visited.add(current);

      // Get all tasks that current depends on
      const dependencies = await this.dependencyRepository.find({
        where: { taskId: current },
        select: ['dependsOnTaskId'],
      });

      for (const dep of dependencies) {
        if (!visited.has(dep.dependsOnTaskId)) {
          stack.push(dep.dependsOnTaskId);
        }
      }
    }

    return false;
  }
}
