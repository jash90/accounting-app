import { BadRequestException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';

import {
  type Client,
  type ClientIcon,
  ClientIconAssignment,
  IconType,
  PaginatedResponseDto,
  UserRole,
  type User,
} from '@accounting/common';

import {
  ClientNotFoundException,
  IconAssignmentException,
  IconNotFoundException,
} from '../exceptions';
import { ClientIconsService } from './client-icons.service';

describe('ClientIconsService', () => {
  let service: ClientIconsService;

  const mockCompanyId = 'company-123';
  const mockUserId = 'user-123';

  const mockUser: Partial<User> = {
    id: mockUserId,
    email: 'test@example.com',
    role: UserRole.COMPANY_OWNER,
    companyId: mockCompanyId,
  };

  const mockIcon: Partial<ClientIcon> = {
    id: 'icon-1',
    name: 'Star Icon',
    color: '#FF5733',
    iconType: IconType.LUCIDE,
    iconValue: 'star',
    companyId: mockCompanyId,
    isActive: true,
    createdById: mockUserId,
  };

  const mockClient: Partial<Client> = {
    id: 'client-1',
    name: 'Test Client',
    companyId: mockCompanyId,
  };

  const mockAssignment: Partial<ClientIconAssignment> = {
    id: 'assignment-1',
    clientId: 'client-1',
    iconId: 'icon-1',
    isAutoAssigned: false,
  };

  const mockTenantService = {
    getEffectiveCompanyId: jest.fn(),
  };

  const mockStorageService = {
    uploadIcon: jest.fn(),
    deleteFile: jest.fn(),
    getFileUrl: jest.fn(),
  };

  const mockAutoAssignService = {
    reevaluateIconForAllClients: jest.fn(),
  };

  const mockIconRepo = {
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockAssignmentRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockClientRepo = {
    findOne: jest.fn(),
  };

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockDataSource = {
    createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockTenantService.getEffectiveCompanyId.mockResolvedValue(mockCompanyId);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ClientIconsService,
          useFactory: () => {
            return new ClientIconsService(
              mockIconRepo as any,
              mockAssignmentRepo as any,
              mockClientRepo as any,
              mockStorageService as any,
              mockAutoAssignService as any,
              mockTenantService as any,
              mockDataSource as any
            );
          },
        },
      ],
    }).compile();

    service = module.get<ClientIconsService>(ClientIconsService);
  });

  describe('findAllIcons', () => {
    it('should return paginated icons for company', async () => {
      mockIconRepo.findAndCount.mockResolvedValue([[mockIcon], 1]);

      const result = await service.findAllIcons(mockUser as User);

      expect(result).toBeInstanceOf(PaginatedResponseDto);
      expect(result.data).toEqual([mockIcon]);
      expect(result.meta.total).toBe(1);
      expect(mockIconRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { companyId: mockCompanyId, isActive: true },
          order: { name: 'ASC' },
        })
      );
    });

    it('should support pagination params', async () => {
      mockIconRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAllIcons(mockUser as User, { page: 2, limit: 10 });

      expect(mockIconRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 })
      );
    });
  });

  describe('findIconById', () => {
    it('should return icon when found', async () => {
      mockIconRepo.findOne.mockResolvedValue(mockIcon);

      const result = await service.findIconById('icon-1', mockUser as User);

      expect(result).toEqual(mockIcon);
    });

    it('should throw IconNotFoundException when not found', async () => {
      mockIconRepo.findOne.mockResolvedValue(null);

      await expect(service.findIconById('bad-id', mockUser as User)).rejects.toThrow(
        IconNotFoundException
      );
    });
  });

  describe('createIcon', () => {
    it('should create a LUCIDE icon without file', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue(null);
      mockQueryRunner.manager.create.mockReturnValue({ ...mockIcon });
      mockQueryRunner.manager.save.mockResolvedValue({ ...mockIcon });

      const result = await service.createIcon(
        { name: 'Star Icon', iconType: IconType.LUCIDE, iconValue: 'star' },
        undefined,
        mockUser as User
      );

      expect(result).toBeDefined();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException when CUSTOM type has no file', async () => {
      await expect(
        service.createIcon(
          { name: 'Custom Icon', iconType: IconType.CUSTOM } as any,
          undefined,
          mockUser as User
        )
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when LUCIDE type has no iconValue', async () => {
      await expect(
        service.createIcon(
          { name: 'Bad Icon', iconType: IconType.LUCIDE } as any,
          undefined,
          mockUser as User
        )
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for duplicate icon name', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue(mockIcon);

      await expect(
        service.createIcon(
          { name: 'Star Icon', iconType: IconType.EMOJI, iconValue: 'star-emoji' } as any,
          undefined,
          mockUser as User
        )
      ).rejects.toThrow(BadRequestException);
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should upload file for CUSTOM icon type', async () => {
      const mockFile = {
        originalname: 'icon.png',
        mimetype: 'image/png',
        size: 1024,
      } as Express.Multer.File;
      mockStorageService.uploadIcon.mockResolvedValue({ path: '/icons/icon.png' });
      mockQueryRunner.manager.findOne.mockResolvedValue(null);
      mockQueryRunner.manager.create.mockReturnValue({ ...mockIcon, iconType: IconType.CUSTOM });
      mockQueryRunner.manager.save.mockResolvedValue({ ...mockIcon, iconType: IconType.CUSTOM });

      await service.createIcon({ name: 'Custom' } as any, mockFile, mockUser as User);

      expect(mockStorageService.uploadIcon).toHaveBeenCalledWith(mockFile, mockCompanyId);
    });

    it('should trigger auto-assign evaluation when autoAssignCondition is set', async () => {
      const savedIcon = { ...mockIcon, autoAssignCondition: { type: 'AND', conditions: [] } };
      mockQueryRunner.manager.findOne.mockResolvedValue(null);
      mockQueryRunner.manager.create.mockReturnValue(savedIcon);
      mockQueryRunner.manager.save.mockResolvedValue(savedIcon);

      await service.createIcon(
        {
          name: 'Auto Icon',
          iconType: IconType.LUCIDE,
          iconValue: 'star',
          autoAssignCondition: { type: 'AND', conditions: [] } as any,
        },
        undefined,
        mockUser as User
      );

      expect(mockAutoAssignService.reevaluateIconForAllClients).toHaveBeenCalledWith(savedIcon);
    });
  });

  describe('removeIcon', () => {
    it('should soft-delete icon and remove assignments in transaction', async () => {
      mockIconRepo.findOne.mockResolvedValue({ ...mockIcon });

      await service.removeIcon('icon-1', mockUser as User);

      expect(mockQueryRunner.manager.delete).toHaveBeenCalledWith(ClientIconAssignment, {
        iconId: 'icon-1',
      });
      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false })
      );
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should delete file from storage after transaction', async () => {
      mockIconRepo.findOne.mockResolvedValue({ ...mockIcon, filePath: '/icons/file.png' });

      await service.removeIcon('icon-1', mockUser as User);

      expect(mockStorageService.deleteFile).toHaveBeenCalledWith('/icons/file.png');
    });

    it('should not fail if file deletion fails', async () => {
      mockIconRepo.findOne.mockResolvedValue({ ...mockIcon, filePath: '/icons/file.png' });
      mockStorageService.deleteFile.mockRejectedValue(new Error('S3 error'));

      await expect(service.removeIcon('icon-1', mockUser as User)).resolves.toBeUndefined();
    });
  });

  describe('getClientIcons', () => {
    it('should return active icons for a client', async () => {
      mockClientRepo.findOne.mockResolvedValue(mockClient);
      mockAssignmentRepo.find.mockResolvedValue([
        { ...mockAssignment, icon: { ...mockIcon, isActive: true } },
      ]);

      const result = await service.getClientIcons('client-1', mockUser as User);

      expect(result).toHaveLength(1);
    });

    it('should filter out inactive icons', async () => {
      mockClientRepo.findOne.mockResolvedValue(mockClient);
      mockAssignmentRepo.find.mockResolvedValue([
        { ...mockAssignment, icon: { ...mockIcon, isActive: false } },
      ]);

      const result = await service.getClientIcons('client-1', mockUser as User);

      expect(result).toHaveLength(0);
    });

    it('should throw ClientNotFoundException for unknown client', async () => {
      mockClientRepo.findOne.mockResolvedValue(null);

      await expect(service.getClientIcons('bad-id', mockUser as User)).rejects.toThrow(
        ClientNotFoundException
      );
    });
  });

  describe('assignIcon', () => {
    it('should assign icon to client via upsert', async () => {
      mockClientRepo.findOne.mockResolvedValue(mockClient);
      mockIconRepo.findOne.mockResolvedValue(mockIcon);

      const mockQb = {
        insert: jest.fn().mockReturnThis(),
        into: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        orIgnore: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({}),
      };
      mockAssignmentRepo.createQueryBuilder.mockReturnValue(mockQb);
      mockAssignmentRepo.findOne.mockResolvedValue(mockAssignment);

      const result = await service.assignIcon(
        { clientId: 'client-1', iconId: 'icon-1' },
        mockUser as User
      );

      expect(result).toEqual(mockAssignment);
    });

    it('should throw ClientNotFoundException for unknown client', async () => {
      mockClientRepo.findOne.mockResolvedValue(null);

      await expect(
        service.assignIcon({ clientId: 'bad', iconId: 'icon-1' }, mockUser as User)
      ).rejects.toThrow(ClientNotFoundException);
    });

    it('should throw IconNotFoundException for unknown icon', async () => {
      mockClientRepo.findOne.mockResolvedValue(mockClient);
      mockIconRepo.findOne.mockResolvedValue(null);

      await expect(
        service.assignIcon({ clientId: 'client-1', iconId: 'bad' }, mockUser as User)
      ).rejects.toThrow(IconNotFoundException);
    });
  });

  describe('unassignIcon', () => {
    it('should delete assignment', async () => {
      mockClientRepo.findOne.mockResolvedValue(mockClient);

      await service.unassignIcon('client-1', 'icon-1', mockUser as User);

      expect(mockAssignmentRepo.delete).toHaveBeenCalledWith({
        clientId: 'client-1',
        iconId: 'icon-1',
      });
    });

    it('should throw ClientNotFoundException for unknown client', async () => {
      mockClientRepo.findOne.mockResolvedValue(null);

      await expect(service.unassignIcon('bad', 'icon-1', mockUser as User)).rejects.toThrow(
        ClientNotFoundException
      );
    });
  });

  describe('setClientIcons', () => {
    it('should replace all icon assignments in transaction', async () => {
      mockClientRepo.findOne.mockResolvedValue(mockClient);
      mockIconRepo.findOne.mockResolvedValue(mockIcon);
      mockQueryRunner.manager.create.mockReturnValue(mockAssignment);
      mockQueryRunner.manager.save.mockResolvedValue([mockAssignment]);

      const result = await service.setClientIcons('client-1', ['icon-1'], mockUser as User);

      expect(mockQueryRunner.manager.delete).toHaveBeenCalledWith(ClientIconAssignment, {
        clientId: 'client-1',
      });
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it('should throw ClientNotFoundException for unknown client', async () => {
      mockClientRepo.findOne.mockResolvedValue(null);

      await expect(service.setClientIcons('bad', ['icon-1'], mockUser as User)).rejects.toThrow(
        ClientNotFoundException
      );
    });

    it('should throw IconNotFoundException for unknown icon in list', async () => {
      mockClientRepo.findOne.mockResolvedValue(mockClient);
      mockIconRepo.findOne.mockResolvedValue(null);

      await expect(
        service.setClientIcons('client-1', ['bad-icon'], mockUser as User)
      ).rejects.toThrow(IconNotFoundException);
    });

    it('should handle empty icon list (remove all)', async () => {
      mockClientRepo.findOne.mockResolvedValue(mockClient);

      const result = await service.setClientIcons('client-1', [], mockUser as User);

      expect(mockQueryRunner.manager.delete).toHaveBeenCalledWith(ClientIconAssignment, {
        clientId: 'client-1',
      });
      expect(result).toHaveLength(0);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should rollback and throw on transaction error', async () => {
      mockClientRepo.findOne.mockResolvedValue(mockClient);
      mockIconRepo.findOne.mockResolvedValue(mockIcon);
      mockQueryRunner.manager.delete.mockRejectedValueOnce(new Error('DB error'));

      await expect(
        service.setClientIcons('client-1', ['icon-1'], mockUser as User)
      ).rejects.toThrow(IconAssignmentException);
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe('getIconUrl', () => {
    it('should return URL for icon with filePath', async () => {
      mockIconRepo.findOne.mockResolvedValue({ ...mockIcon, filePath: '/icons/file.png' });
      mockStorageService.getFileUrl.mockResolvedValue('https://cdn.example.com/icons/file.png');

      const result = await service.getIconUrl('icon-1', mockUser as User);

      expect(result).toBe('https://cdn.example.com/icons/file.png');
    });

    it('should throw IconNotFoundException when icon has no filePath', async () => {
      mockIconRepo.findOne.mockResolvedValue({ ...mockIcon, filePath: undefined });

      await expect(service.getIconUrl('icon-1', mockUser as User)).rejects.toThrow(
        IconNotFoundException
      );
    });
  });
});
