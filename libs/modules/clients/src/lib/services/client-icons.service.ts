import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ClientIcon,
  ClientIconAssignment,
  Client,
  Company,
  User,
  UserRole,
  IconType,
  AutoAssignCondition,
} from '@accounting/common';
import { StorageService } from '@accounting/infrastructure/storage';
import { AutoAssignService } from './auto-assign.service';

export interface CreateIconDto {
  name: string;
  color?: string;
  iconType?: IconType;
  iconValue?: string;
  tooltip?: string;
  autoAssignCondition?: AutoAssignCondition;
}

export interface UpdateIconDto extends Partial<CreateIconDto> {}

export interface AssignIconDto {
  clientId: string;
  iconId: string;
}

@Injectable()
export class ClientIconsService {
  constructor(
    @InjectRepository(ClientIcon)
    private readonly iconRepository: Repository<ClientIcon>,
    @InjectRepository(ClientIconAssignment)
    private readonly assignmentRepository: Repository<ClientIconAssignment>,
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly storageService: StorageService,
    private readonly autoAssignService: AutoAssignService,
  ) {}

  private async getEffectiveCompanyId(user: User): Promise<string> {
    if (user.role === UserRole.ADMIN) {
      const systemCompany = await this.companyRepository.findOne({
        where: { isSystemCompany: true },
      });
      if (!systemCompany) {
        throw new ForbiddenException('System company not found for admin user');
      }
      return systemCompany.id;
    }
    return user.companyId;
  }

  // Icon CRUD

  async findAllIcons(user: User): Promise<ClientIcon[]> {
    const companyId = await this.getEffectiveCompanyId(user);

    return this.iconRepository.find({
      where: { companyId, isActive: true },
      order: { name: 'ASC' },
    });
  }

  async findIconById(id: string, user: User): Promise<ClientIcon> {
    const companyId = await this.getEffectiveCompanyId(user);

    const icon = await this.iconRepository.findOne({
      where: { id, companyId },
    });

    if (!icon) {
      throw new NotFoundException(`Icon with ID ${id} not found`);
    }

    return icon;
  }

  async createIcon(
    dto: CreateIconDto,
    file: Express.Multer.File | undefined,
    user: User,
  ): Promise<ClientIcon> {
    const companyId = await this.getEffectiveCompanyId(user);
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
      const result = await this.storageService.uploadIcon(file, companyId);
      iconData.fileName = file.originalname;
      iconData.filePath = result.path;
      iconData.mimeType = file.mimetype;
      iconData.fileSize = file.size;
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
    const companyId = await this.getEffectiveCompanyId(user);

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
      // Delete old file if exists
      if (icon.filePath) {
        await this.storageService.deleteFile(icon.filePath);
      }

      // Upload new file
      const result = await this.storageService.uploadIcon(file, companyId);
      icon.fileName = file.originalname;
      icon.filePath = result.path;
      icon.mimeType = file.mimetype;
      icon.fileSize = file.size;
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
      throw new NotFoundException('Icon file not found');
    }

    return this.storageService.getFileUrl(icon.filePath);
  }

  // Icon Assignments

  async getClientIcons(clientId: string, user: User): Promise<ClientIcon[]> {
    const companyId = await this.getEffectiveCompanyId(user);

    // Verify client
    const client = await this.clientRepository.findOne({
      where: { id: clientId, companyId },
    });

    if (!client) {
      throw new NotFoundException(`Client with ID ${clientId} not found`);
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
    const companyId = await this.getEffectiveCompanyId(user);

    // Verify client
    const client = await this.clientRepository.findOne({
      where: { id: dto.clientId, companyId },
    });

    if (!client) {
      throw new NotFoundException(`Client with ID ${dto.clientId} not found`);
    }

    // Verify icon
    const icon = await this.iconRepository.findOne({
      where: { id: dto.iconId, companyId, isActive: true },
    });

    if (!icon) {
      throw new NotFoundException(`Icon with ID ${dto.iconId} not found`);
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
    const companyId = await this.getEffectiveCompanyId(user);

    // Verify client
    const client = await this.clientRepository.findOne({
      where: { id: clientId, companyId },
    });

    if (!client) {
      throw new NotFoundException(`Client with ID ${clientId} not found`);
    }

    await this.assignmentRepository.delete({ clientId, iconId });
  }

  async setClientIcons(
    clientId: string,
    iconIds: string[],
    user: User,
  ): Promise<ClientIcon[]> {
    const companyId = await this.getEffectiveCompanyId(user);

    // Verify client
    const client = await this.clientRepository.findOne({
      where: { id: clientId, companyId },
    });

    if (!client) {
      throw new NotFoundException(`Client with ID ${clientId} not found`);
    }

    // Verify all icons exist
    const icons: ClientIcon[] = [];
    for (const iconId of iconIds) {
      const icon = await this.iconRepository.findOne({
        where: { id: iconId, companyId, isActive: true },
      });
      if (!icon) {
        throw new BadRequestException(`Icon with ID ${iconId} not found`);
      }
      icons.push(icon);
    }

    // Remove all existing assignments
    await this.assignmentRepository.delete({ clientId });

    // Create new assignments
    const assignments = iconIds.map((iconId) =>
      this.assignmentRepository.create({ clientId, iconId }),
    );

    await this.assignmentRepository.save(assignments);

    return icons;
  }
}
