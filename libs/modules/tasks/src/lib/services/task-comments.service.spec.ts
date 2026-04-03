import { SystemCompanyService } from '@accounting/common/backend';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { type Repository } from 'typeorm';

import { Task, TaskComment, type User } from '@accounting/common';

import { TaskCommentNotFoundException, TaskNotFoundException } from '../exceptions';
import { TaskCommentsService } from './task-comments.service';

describe('TaskCommentsService', () => {
  let service: TaskCommentsService;
  let taskRepository: jest.Mocked<Repository<Task>>;
  let commentRepository: jest.Mocked<Repository<TaskComment>>;
  let systemCompanyService: jest.Mocked<Pick<SystemCompanyService, 'getCompanyIdForUser'>>;

  const companyId = 'company-1';
  const userId = 'user-1';
  const taskId = 'task-1';
  const commentId = 'comment-1';

  const mockUser = { id: userId, companyId, role: 'EMPLOYEE' } as User;
  const mockAdmin = { id: 'admin-1', companyId, role: 'ADMIN' } as User;
  const mockOwner = { id: 'owner-1', companyId, role: 'COMPANY_OWNER' } as User;
  const mockOtherUser = { id: 'other-1', companyId, role: 'EMPLOYEE' } as User;

  const mockTask = { id: taskId, companyId } as Task;

  const mockComment: TaskComment = {
    id: commentId,
    content: 'Test comment',
    taskId,
    authorId: userId,
    isEdited: false,
    task: mockTask,
    author: mockUser,
  } as unknown as TaskComment;

  beforeEach(async () => {
    jest.clearAllMocks();

    taskRepository = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<Task>>;

    commentRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    } as unknown as jest.Mocked<Repository<TaskComment>>;

    systemCompanyService = {
      getCompanyIdForUser: jest.fn().mockResolvedValue(companyId),
    };

    const module = await Test.createTestingModule({
      providers: [
        {
          provide: TaskCommentsService,
          useFactory: () =>
            new TaskCommentsService(
              taskRepository as any,
              commentRepository as any,
              systemCompanyService as any
            ),
        },
        { provide: getRepositoryToken(Task), useValue: taskRepository },
        { provide: getRepositoryToken(TaskComment), useValue: commentRepository },
        { provide: SystemCompanyService, useValue: systemCompanyService },
      ],
    }).compile();

    service = module.get(TaskCommentsService);
  });

  describe('findAllForTask', () => {
    it('should return comments for a task ordered by createdAt', async () => {
      const comments = [mockComment] as TaskComment[];
      taskRepository.findOne.mockResolvedValue(mockTask);
      commentRepository.find.mockResolvedValue(comments);

      const result = await service.findAllForTask(taskId, mockUser);

      expect(result).toEqual(comments);
      expect(systemCompanyService.getCompanyIdForUser).toHaveBeenCalledWith(mockUser);
      expect(taskRepository.findOne).toHaveBeenCalledWith({
        where: { id: taskId, companyId },
      });
      expect(commentRepository.find).toHaveBeenCalledWith({
        where: { taskId },
        relations: ['author'],
        order: { createdAt: 'ASC' },
      });
    });

    it('should throw TaskNotFoundException when task does not exist', async () => {
      taskRepository.findOne.mockResolvedValue(null);

      await expect(service.findAllForTask('nonexistent', mockUser)).rejects.toThrow(
        TaskNotFoundException
      );
    });
  });

  describe('create', () => {
    it('should create a comment with correct authorId', async () => {
      const dto = { content: 'New comment' };
      const createdComment = { ...mockComment, content: 'New comment' } as TaskComment;

      taskRepository.findOne.mockResolvedValue(mockTask);
      commentRepository.create.mockReturnValue(createdComment);
      commentRepository.save.mockResolvedValue(createdComment);
      commentRepository.findOne.mockResolvedValue(createdComment);

      const result = await service.create(taskId, dto as any, mockUser);

      expect(result).toEqual(createdComment);
      expect(commentRepository.create).toHaveBeenCalledWith({
        ...dto,
        taskId,
        authorId: userId,
      });
    });

    it('should throw TaskNotFoundException when task does not exist', async () => {
      taskRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create('nonexistent', { content: 'x' } as any, mockUser)
      ).rejects.toThrow(TaskNotFoundException);
    });
  });

  describe('update', () => {
    it('should update comment content and set isEdited to true', async () => {
      const dto = { content: 'Updated content' };
      const updatedComment = {
        ...mockComment,
        content: 'Updated content',
        isEdited: true,
      } as unknown as TaskComment;

      commentRepository.findOne.mockResolvedValueOnce(mockComment);
      commentRepository.save.mockResolvedValue(updatedComment);
      commentRepository.findOne.mockResolvedValueOnce(updatedComment);

      const result = await service.update(commentId, dto as any, mockUser);

      expect(result).toEqual(updatedComment);
      expect(commentRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ content: 'Updated content', isEdited: true })
      );
    });

    it('should throw TaskCommentNotFoundException when only author can edit', async () => {
      const commentByOther = { ...mockComment, authorId: 'other-1' } as unknown as TaskComment;
      commentRepository.findOne.mockResolvedValue(commentByOther);

      await expect(service.update(commentId, { content: 'hack' } as any, mockUser)).rejects.toThrow(
        TaskCommentNotFoundException
      );
    });

    it('should throw TaskCommentNotFoundException when comment not found', async () => {
      commentRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', { content: 'x' } as any, mockUser)
      ).rejects.toThrow(TaskCommentNotFoundException);
    });
  });

  describe('remove', () => {
    it('should allow author to delete their own comment', async () => {
      commentRepository.findOne.mockResolvedValue(mockComment);
      commentRepository.remove.mockResolvedValue(mockComment);

      await service.remove(commentId, mockUser);

      expect(commentRepository.remove).toHaveBeenCalledWith(mockComment);
    });

    it('should allow ADMIN to delete any comment', async () => {
      commentRepository.findOne.mockResolvedValue(mockComment);
      commentRepository.remove.mockResolvedValue(mockComment);

      await service.remove(commentId, mockAdmin);

      expect(commentRepository.remove).toHaveBeenCalledWith(mockComment);
    });

    it('should allow COMPANY_OWNER to delete any comment', async () => {
      commentRepository.findOne.mockResolvedValue(mockComment);
      commentRepository.remove.mockResolvedValue(mockComment);

      await service.remove(commentId, mockOwner);

      expect(commentRepository.remove).toHaveBeenCalledWith(mockComment);
    });

    it('should throw TaskCommentNotFoundException when non-author employee tries to delete', async () => {
      commentRepository.findOne.mockResolvedValue(mockComment);

      await expect(service.remove(commentId, mockOtherUser)).rejects.toThrow(
        TaskCommentNotFoundException
      );
    });
  });
});
