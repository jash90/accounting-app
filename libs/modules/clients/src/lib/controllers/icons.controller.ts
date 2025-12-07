import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard, CurrentUser } from '@accounting/auth';
import {
  ModuleAccessGuard,
  PermissionGuard,
  RequireModule,
  RequirePermission,
  OwnerOrAdminGuard,
  OwnerOrAdmin,
} from '@accounting/rbac';
import { User } from '@accounting/common';
import { IconFileValidator } from '@accounting/infrastructure/storage';
import { ClientIconsService } from '../services/client-icons.service';
import { CreateIconDto, UpdateIconDto, AssignIconDto } from '../dto/icon.dto';

@ApiTags('Client Icons')
@ApiBearerAuth()
@Controller('clients/icons')
@UseGuards(JwtAuthGuard, ModuleAccessGuard, PermissionGuard)
@RequireModule('clients')
export class IconsController {
  constructor(private readonly iconsService: ClientIconsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all icons' })
  @ApiResponse({ status: 200, description: 'List of icons' })
  @RequirePermission('clients', 'read')
  async findAll(@CurrentUser() user: User) {
    return this.iconsService.findAllIcons(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an icon by ID' })
  @ApiResponse({ status: 200, description: 'Icon details' })
  @ApiResponse({ status: 404, description: 'Icon not found' })
  @RequirePermission('clients', 'read')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.iconsService.findIconById(id, user);
  }

  @Get(':id/url')
  @ApiOperation({ summary: 'Get icon file URL' })
  @ApiResponse({ status: 200, description: 'Icon URL' })
  @ApiResponse({ status: 404, description: 'Icon not found' })
  @RequirePermission('clients', 'read')
  async getUrl(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    const url = await this.iconsService.getIconUrl(id, user);
    return { url };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new icon' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        color: { type: 'string' },
        iconType: { type: 'string', enum: ['lucide', 'custom', 'emoji'] },
        iconValue: { type: 'string' },
        autoAssignCondition: { type: 'string', description: 'JSON string with auto-assign condition' },
        file: { type: 'string', format: 'binary' },
      },
      required: ['name'],
    },
  })
  @ApiResponse({ status: 201, description: 'Icon created' })
  @UseGuards(OwnerOrAdminGuard)
  @OwnerOrAdmin()
  @RequirePermission('clients', 'write')
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @Body() dto: CreateIconDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: User,
  ) {
    return this.iconsService.createIcon(dto, file, user);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an icon' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        color: { type: 'string' },
        iconType: { type: 'string', enum: ['lucide', 'custom', 'emoji'] },
        iconValue: { type: 'string' },
        autoAssignCondition: { type: 'string', description: 'JSON string with auto-assign condition (null to remove)' },
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Icon updated' })
  @ApiResponse({ status: 404, description: 'Icon not found' })
  @UseGuards(OwnerOrAdminGuard)
  @OwnerOrAdmin()
  @RequirePermission('clients', 'write')
  @UseInterceptors(FileInterceptor('file'))
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateIconDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: User,
  ) {
    return this.iconsService.updateIcon(id, dto, file, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an icon' })
  @ApiResponse({ status: 200, description: 'Icon deleted' })
  @ApiResponse({ status: 404, description: 'Icon not found' })
  @UseGuards(OwnerOrAdminGuard)
  @OwnerOrAdmin()
  @RequirePermission('clients', 'delete')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    await this.iconsService.removeIcon(id, user);
    return { message: 'Icon deleted successfully' };
  }

  @Post('assign')
  @ApiOperation({ summary: 'Assign an icon to a client' })
  @ApiResponse({ status: 201, description: 'Icon assigned' })
  @RequirePermission('clients', 'write')
  async assignIcon(@Body() dto: AssignIconDto, @CurrentUser() user: User) {
    return this.iconsService.assignIcon(dto, user);
  }

  @Delete('unassign/:clientId/:iconId')
  @ApiOperation({ summary: 'Unassign an icon from a client' })
  @ApiResponse({ status: 200, description: 'Icon unassigned' })
  @RequirePermission('clients', 'write')
  async unassignIcon(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Param('iconId', ParseUUIDPipe) iconId: string,
    @CurrentUser() user: User,
  ) {
    await this.iconsService.unassignIcon(clientId, iconId, user);
    return { message: 'Icon unassigned successfully' };
  }

  @Get('client/:clientId')
  @ApiOperation({ summary: 'Get icons assigned to a client' })
  @ApiResponse({ status: 200, description: 'Client icons' })
  @RequirePermission('clients', 'read')
  async getClientIcons(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @CurrentUser() user: User,
  ) {
    return this.iconsService.getClientIcons(clientId, user);
  }
}
