import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { type Repository } from 'typeorm';

import { TaskLabel, type User } from '@accounting/common';
import { SystemCompanyService } from '@accounting/common/backend';

import { TaskLabelAlreadyExistsException, TaskLabelNotFoundException } from '../exceptions';
import { TaskLabelsService } from './task-labels.service';

describe('TaskLabelsService', () => {
  let service: TaskLabelsService;
  let labelRepository: jest.Mocked<Repository<TaskLabel>>;
  let systemCompanyService: jest.Mocked<Pick<SystemCompanyService, 'getCompanyIdForUser'>>;

  const companyId = 'company-1';
  const mockUser = { id: 'user-1', companyId, role: 'EMPLOYEE' } as User;

  const mockLabel: TaskLabel = {
    id: 'label-1',
    name: 'Bug',
    color: '#ff0000',
    companyId,
    isActive: true,
    createdById: mockUser.id,
  } as TaskLabel;

  beforeEach(async () => {
    jest.clearAllMocks();

    labelRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<TaskLabel>>;

    systemCompanyService = {
      getCompanyIdForUser: jest.fn().mockResolvedValue(companyId),
    };

    const module = await Test.createTestingModule({
      providers: [
        {
          provide: TaskLabelsService,
          useFactory: () =>
            new TaskLabelsService(labelRepository as any, systemCompanyService as any),
        },
        { provide: getRepositoryToken(TaskLabel), useValue: labelRepository },
        { provide: SystemCompanyService, useValue: systemCompanyService },
      ],
    }).compile();

    service = module.get(TaskLabelsService);
  });

  describe('findAll', () => {
    it('should return labels sorted by name with tenant isolation', async () => {
      const labels = [mockLabel, { ...mockLabel, id: 'label-2', name: 'Feature' }] as TaskLabel[];
      labelRepository.find.mockResolvedValue(labels);

      const result = await service.findAll(mockUser);

      expect(result).toEqual(labels);
      expect(systemCompanyService.getCompanyIdForUser).toHaveBeenCalledWith(mockUser);
      expect(labelRepository.find).toHaveBeenCalledWith({
        where: { companyId, isActive: true },
        order: { name: 'ASC' },
      });
    });
  });

  describe('findOne', () => {
    it('should return a label by id', async () => {
      labelRepository.findOne.mockResolvedValue(mockLabel);

      const result = await service.findOne('label-1', mockUser);

      expect(result).toEqual(mockLabel);
      expect(labelRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'label-1', companyId },
      });
    });

    it('should throw TaskLabelNotFoundException when label not found', async () => {
      labelRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('nonexistent', mockUser)).rejects.toThrow(
        TaskLabelNotFoundException
      );
    });
  });

  describe('create', () => {
    it('should create a label successfully', async () => {
      const dto = { name: 'Bug', color: '#ff0000' };
      labelRepository.findOne.mockResolvedValue(null); // no duplicate
      labelRepository.create.mockReturnValue(mockLabel);
      labelRepository.save.mockResolvedValue(mockLabel);

      const result = await service.create(dto as any, mockUser);

      expect(result).toEqual(mockLabel);
      expect(labelRepository.create).toHaveBeenCalledWith({
        ...dto,
        companyId,
        createdById: mockUser.id,
      });
      expect(labelRepository.save).toHaveBeenCalledWith(mockLabel);
    });

    it('should throw TaskLabelAlreadyExistsException on duplicate name', async () => {
      const dto = { name: 'Bug', color: '#ff0000' };
      labelRepository.findOne.mockResolvedValue(mockLabel); // duplicate exists

      await expect(service.create(dto as any, mockUser)).rejects.toThrow(
        TaskLabelAlreadyExistsException
      );
    });
  });

  describe('update', () => {
    it('should update a label successfully', async () => {
      const dto = { name: 'Updated Bug' };
      const updatedLabel = { ...mockLabel, name: 'Updated Bug' } as TaskLabel;

      // findOne call inside findOne method
      labelRepository.findOne.mockResolvedValueOnce(mockLabel);
      // duplicate check
      labelRepository.findOne.mockResolvedValueOnce(null);
      labelRepository.save.mockResolvedValue(updatedLabel);

      const result = await service.update('label-1', dto as any, mockUser);

      expect(result).toEqual(updatedLabel);
      expect(labelRepository.save).toHaveBeenCalled();
    });

    it('should throw TaskLabelAlreadyExistsException on duplicate name when renaming', async () => {
      const dto = { name: 'Feature' };
      const existingOther = { ...mockLabel, id: 'label-2', name: 'Feature' } as TaskLabel;

      // findOne for the label being updated
      labelRepository.findOne.mockResolvedValueOnce(mockLabel);
      // duplicate check finds another label with same name
      labelRepository.findOne.mockResolvedValueOnce(existingOther);

      await expect(service.update('label-1', dto as any, mockUser)).rejects.toThrow(
        TaskLabelAlreadyExistsException
      );
    });
  });

  describe('softDeleteTaskLabel', () => {
    it('should set isActive to false', async () => {
      labelRepository.findOne.mockResolvedValue({ ...mockLabel });
      labelRepository.save.mockResolvedValue({ ...mockLabel, isActive: false } as TaskLabel);

      await service.softDeleteTaskLabel('label-1', mockUser);

      expect(labelRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false })
      );
    });

    it('should throw TaskLabelNotFoundException when label not found', async () => {
      labelRepository.findOne.mockResolvedValue(null);

      await expect(service.softDeleteTaskLabel('nonexistent', mockUser)).rejects.toThrow(
        TaskLabelNotFoundException
      );
    });
  });
});
