import { SystemCompanyService } from '@accounting/common/backend';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Task, TaskComment, User } from '@accounting/common';

import { CreateTaskCommentDto, UpdateTaskCommentDto } from '../dto/task-comment.dto';
import { TaskCommentNotFoundException, TaskNotFoundException } from '../exceptions';

@Injectable()
export class TaskCommentsService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(TaskComment)
    private readonly commentRepository: Repository<TaskComment>,
    private readonly systemCompanyService: SystemCompanyService
  ) {}

  async findAllForTask(taskId: string, user: User): Promise<TaskComment[]> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);

    // Verify task exists and belongs to company
    const task = await this.taskRepository.findOne({
      where: { id: taskId, companyId },
    });
    if (!task) {
      throw new TaskNotFoundException(taskId, companyId);
    }

    return this.commentRepository.find({
      where: { taskId },
      relations: ['author'],
      order: { createdAt: 'ASC' },
    });
  }

  async create(taskId: string, dto: CreateTaskCommentDto, user: User): Promise<TaskComment> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);

    // Verify task exists
    const task = await this.taskRepository.findOne({
      where: { id: taskId, companyId },
    });
    if (!task) {
      throw new TaskNotFoundException(taskId, companyId);
    }

    const comment = this.commentRepository.create({
      ...dto,
      taskId,
      authorId: user.id,
    });

    const savedComment = await this.commentRepository.save(comment);

    // Load author relation
    return this.commentRepository.findOne({
      where: { id: savedComment.id },
      relations: ['author'],
    }) as Promise<TaskComment>;
  }

  async update(commentId: string, dto: UpdateTaskCommentDto, user: User): Promise<TaskComment> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);
    const comment = await this.commentRepository.findOne({
      where: { id: commentId, task: { companyId } },
      relations: ['task', 'author'],
    });

    if (!comment) {
      throw new TaskCommentNotFoundException(commentId);
    }

    // Only author can edit their comment
    if (comment.authorId !== user.id) {
      throw new TaskCommentNotFoundException(commentId);
    }

    comment.content = dto.content;
    comment.isEdited = true;

    const savedComment = await this.commentRepository.save(comment);

    return this.commentRepository.findOne({
      where: { id: savedComment.id },
      relations: ['author'],
    }) as Promise<TaskComment>;
  }

  async remove(commentId: string, user: User): Promise<void> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);
    const comment = await this.commentRepository.findOne({
      where: { id: commentId, task: { companyId } },
      relations: ['task'],
    });

    if (!comment) {
      throw new TaskCommentNotFoundException(commentId);
    }

    // Only author or admin can delete
    if (comment.authorId !== user.id && user.role !== 'ADMIN' && user.role !== 'COMPANY_OWNER') {
      throw new TaskCommentNotFoundException(commentId);
    }

    await this.commentRepository.remove(comment);
  }
}
