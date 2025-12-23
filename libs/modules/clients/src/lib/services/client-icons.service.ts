import {
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  ClientIcon,
  ClientIconAssignment,
  Client,
  User,
  IconType,
  PaginatedResponseDto,
  TenantService,
} from '@accounting/common';
import { StorageService } from '@accounting/infrastructure/storage';
import { AutoAssignService } from './auto-assign.service';
import {
  CreateIconDto,
  UpdateIconDto,
  AssignIconDto,
  IconQueryDto,
} from '../dto/icon.dto';
import {
  ClientNotFoundException,
  IconNotFoundException,
  IconAssignmentException,
} from '../exceptions';

@Injectable()
export class ClientIconsService {
  constructor(
    @InjectRepository(ClientIcon)
    private readonly iconRepository: Repository<ClientIcon>,
    @InjectRepository(ClientIconAssignment)
    private readonly assignmentRepository: Repository<ClientIconAssignment>,
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    private readonly storageService: StorageService,
    private readonly autoAssignService: AutoAssignService,
    private readonly tenantService: TenantService,
    private readonly dataSource: DataSource,
  ) {}

  // Icon CRUD

  async findAllIcons(
    user: User,
    query?: IconQueryDto,
  ): Promise<PaginatedResponseDto<ClientIcon>> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 50;
    const skip = (page - 1) * limit;

    const [data, total] = await this.iconRepository.findAndCount({
      where: { companyId, isActive: true },
      order: { name: 'ASC' },
      skip,
      take: limit,
    });

    return new PaginatedResponseDto(data, total, page, limit);
  }

  async findIconById(id: string, user: User): Promise<ClientIcon> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    const icon = await this.iconRepository.findOne({
      where: { id, companyId },
    });

    if (!icon) {
      throw new IconNotFoundException(id, companyId);
    }

    return icon;
  }

  async createIcon(
    dto: CreateIconDto,
    file: Express.Multer.File | undefined,
    user: User,
  ): Promise<ClientIcon> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);
    const iconType = dto.iconType || IconType.CUSTOM;

    // Validate based on icon type
    if (iconType === IconType.CUSTOM && !file) {
      throw new BadRequestException(
        'File is required for custom icon type',
      );
    }

    if ((iconType === IconType.LUCIDE || iconType === IconType.EMOJI) && !dto.iconValue) {
      throw new BadRequestException(
        `Icon value is required for ${iconType} icon type`,
      );
    }

    // Check for duplicate name
    const existing = await this.iconRepository.findOne({
      where: { companyId, name: dto.name, isActive: true },
    });

    if (existing) {
      throw new BadRequestException(
        `Icon with name "${dto.name}" already exists`,
      );
    }

    // Build icon data based on type
    const iconData: Partial<ClientIcon> = {
      name: dto.name,
      color: dto.color,
      iconType,
      iconValue: dto.iconValue,
      tooltip: dto.tooltip,
      autoAssignCondition: dto.autoAssignCondition,
      companyId,
      createdById: user.id,
    };

    // Handle file upload for custom type
    if (iconType === IconType.CUSTOM && file) {
      try {
        const result = await this.storageService.uploadIcon(file, companyId);
        iconData.fileName = file.originalname;
        iconData.filePath = result.path;
        iconData.mimeType = file.mimetype;
        iconData.fileSize = file.size;
      } catch (error) {
        throw new BadRequestException(
          `Failed to upload icon file: ${(error as Error).message}`,
        );
      }
    }

    const icon = this.iconRepository.create(iconData);
    const savedIcon = await this.iconRepository.save(icon);

    // If icon has auto-assign condition, evaluate it for all existing clients
    if (savedIcon.autoAssignCondition) {
      await this.autoAssignService.reevaluateIconForAllClients(savedIcon);
    }

    return savedIcon;
  }

  async updateIcon(
    id: string,
    dto: UpdateIconDto,
    file: Express.Multer.File | undefined,
    user: User,
  ): Promise<ClientIcon> {
    const icon = await this.findIconById(id, user);
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    // Check for duplicate name if changing
    if (dto.name && dto.name !== icon.name) {
      const existing = await this.iconRepository.findOne({
        where: { companyId, name: dto.name, isActive: true },
      });

      if (existing) {
        throw new BadRequestException(
          `Icon with name "${dto.name}" already exists`,
        );
      }
    }

    // Determine the effective icon type
    const newIconType = dto.iconType || icon.iconType;

    // Validate icon value for Lucide/emoji types
    if ((newIconType === IconType.LUCIDE || newIconType === IconType.EMOJI)) {
      const effectiveIconValue = dto.iconValue !== undefined ? dto.iconValue : icon.iconValue;
      if (!effectiveIconValue) {
        throw new BadRequestException(
          `Icon value is required for ${newIconType} icon type`,
        );
      }
    }

    // Handle icon type change
    if (dto.iconType && dto.iconType !== icon.iconType) {
      // Changing icon type
      if (dto.iconType !== IconType.CUSTOM) {
        // Switching to Lucide or emoji - clean up file data
        if (icon.filePath) {
          await this.storageService.deleteFile(icon.filePath);
        }
        icon.fileName = undefined;
        icon.filePath = undefined;
        icon.mimeType = undefined;
        icon.fileSize = undefined;
      }
    }

    // Handle file update for custom type
    if (newIconType === IconType.CUSTOM && file) {
      const oldFilePath = icon.filePath;

      // Upload new file FIRST (before deleting old) to prevent data loss on failure
      try {
        const result = await this.storageService.uploadIcon(file, companyId);
        icon.fileName = file.originalname;
        icon.filePath = result.path;
        icon.mimeType = file.mimetype;
        icon.fileSize = file.size;
      } catch (error) {
        throw new BadRequestException(
          `Failed to upload new icon file: ${(error as Error).message}`,
        );
      }

      // Delete old file only after new file is successfully uploaded
      if (oldFilePath) {
        try {
          await this.storageService.deleteFile(oldFilePath);
        } catch {
          // Log but don't fail - the new file is already in place
          // Old file can be cleaned up later via maintenance job
        }
      }
    }

    // Track if auto-assign condition changed
    const conditionChanged =
      JSON.stringify(dto.autoAssignCondition) !==
      JSON.stringify(icon.autoAssignCondition);

    // Apply updates
    Object.assign(icon, {
      name: dto.name ?? icon.name,
      color: dto.color ?? icon.color,
      iconType: dto.iconType ?? icon.iconType,
      iconValue: dto.iconValue ?? icon.iconValue,
      tooltip: dto.tooltip ?? icon.tooltip,
      autoAssignCondition: dto.autoAssignCondition !== undefined
        ? dto.autoAssignCondition
        : icon.autoAssignCondition,
    });

    const savedIcon = await this.iconRepository.save(icon);

    // If auto-assign condition changed, re-evaluate all clients
    if (conditionChanged) {
      await this.autoAssignService.reevaluateIconForAllClients(savedIcon);
    }

    return savedIcon;
  }

  async removeIcon(id: string, user: User): Promise<void> {
    const icon = await this.findIconById(id, user);

    // Remove all assignments for this icon
    await this.assignmentRepository.delete({ iconId: id });

    // Delete file from storage
    if (icon.filePath) {
      await this.storageService.deleteFile(icon.filePath);
    }

    // Soft delete the icon
    icon.isActive = false;
    await this.iconRepository.save(icon);
  }

  async getIconUrl(id: string, user: User): Promise<string> {
    const icon = await this.findIconById(id, user);

    if (!icon.filePath) {
      throw new IconNotFoundException(id, null);
    }

    return this.storageService.getFileUrl(icon.filePath);
  }

  // Icon Assignments

  async getClientIcons(clientId: string, user: User): Promise<ClientIcon[]> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    // Verify client
    const client = await this.clientRepository.findOne({
      where: { id: clientId, companyId },
    });

    if (!client) {
      throw new ClientNotFoundException(clientId, companyId);
    }

    const assignments = await this.assignmentRepository.find({
      where: { clientId },
      relations: ['icon'],
    });

    return assignments
      .filter((a) => a.icon && a.icon.isActive)
      .map((a) => a.icon);
  }

  async assignIcon(dto: AssignIconDto, user: User): Promise<ClientIconAssignment> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    // Verify client
    const client = await this.clientRepository.findOne({
      where: { id: dto.clientId, companyId },
    });

    if (!client) {
      throw new ClientNotFoundException(dto.clientId, companyId);
    }

    // Verify icon
    const icon = await this.iconRepository.findOne({
      where: { id: dto.iconId, companyId, isActive: true },
    });

    if (!icon) {
      throw new IconNotFoundException(dto.iconId, companyId);
    }

    // Check if already assigned
    const existing = await this.assignmentRepository.findOne({
      where: { clientId: dto.clientId, iconId: dto.iconId },
    });

    if (existing) {
      return existing;
    }

    const assignment = this.assignmentRepository.create({
      clientId: dto.clientId,
      iconId: dto.iconId,
    });

    return this.assignmentRepository.save(assignment);
  }

  async unassignIcon(
    clientId: string,
    iconId: string,
    user: User,
  ): Promise<void> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    // Verify client
    const client = await this.clientRepository.findOne({
      where: { id: clientId, companyId },
    });

    if (!client) {
      throw new ClientNotFoundException(clientId, companyId);
    }

    await this.assignmentRepository.delete({ clientId, iconId });
  }

  async setClientIcons(
    clientId: string,
    iconIds: string[],
    user: User,
  ): Promise<ClientIcon[]> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    // Verify client OUTSIDE transaction
    const client = await this.clientRepository.findOne({
      where: { id: clientId, companyId },
    });

    if (!client) {
      throw new ClientNotFoundException(clientId, companyId);
    }

    // Verify all icons exist OUTSIDE transaction
    const icons: ClientIcon[] = [];
    for (const iconId of iconIds) {
      const icon = await this.iconRepository.findOne({
        where: { id: iconId, companyId, isActive: true },
      });
      if (!icon) {
        throw new IconNotFoundException(iconId, companyId);
      }
      icons.push(icon);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Remove all existing assignments
      await queryRunner.manager.delete(ClientIconAssignment, { clientId });

      // Create new assignments if there are any
      if (iconIds.length > 0) {
        const assignments = iconIds.map((iconId) =>
          queryRunner.manager.create(ClientIconAssignment, {
            clientId,
            iconId,
            isAutoAssigned: false, // Manual assignment
          }),
        );
        await queryRunner.manager.save(assignments);
      }

      await queryRunner.commitTransaction();
      return icons;
    } catch (error) {
      await queryRunner.rollbackTransaction();

      throw new IconAssignmentException(
        clientId,
        iconIds.length,
        (error as Error).message,
        {
          companyId,
          userId: user.id,
          operationStage: 'setClientIcons',
        },
      );
    } finally {
      await queryRunner.release();
    }
  }
}
