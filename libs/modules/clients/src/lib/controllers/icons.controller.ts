import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiExtraModels,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { memoryStorage } from 'multer';

import { CurrentUser, JwtAuthGuard } from '@accounting/auth';
import { User } from '@accounting/common';
import {
  ModuleAccessGuard,
  OwnerOrAdmin,
  OwnerOrAdminGuard,
  PermissionGuard,
  RequireModule,
  RequirePermission,
} from '@accounting/rbac';

import { ClientErrorResponseDto, ClientSuccessResponseDto } from '../dto/client-response.dto';
import {
  AssignIconDto,
  CreateIconDto,
  IconAssignmentResponseDto,
  IconQueryDto,
  IconResponseDto,
  IconUrlResponseDto,
  PaginatedIconsResponseDto,
  UpdateIconDto,
} from '../dto/icon.dto';
import { ClientIconsService } from '../services/client-icons.service';

// File upload configuration
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
// Note: SVG intentionally excluded due to XSS/script injection security risks
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

const fileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void
) => {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    callback(
      new BadRequestException(`Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`),
      false
    );
    return;
  }
  callback(null, true);
};

const multerOptions = {
  storage: memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter,
};

/**
 * Controller for managing client icons within the clients module.
 * Icons can be assigned to clients either manually or automatically via auto-assign conditions.
 * Supports three icon types: Lucide icons, custom uploaded images, and emoji.
 * Creating, updating, and deleting icons is restricted to Company Owners and Admins.
 *
 * @security Bearer - JWT token required
 * @module clients - Module access required for company
 */
@ApiTags('Client Icons')
@ApiBearerAuth()
@ApiExtraModels(
  IconResponseDto,
  PaginatedIconsResponseDto,
  IconAssignmentResponseDto,
  IconUrlResponseDto,
  ClientSuccessResponseDto,
  ClientErrorResponseDto
)
@Controller('modules/clients/icons')
@UseGuards(JwtAuthGuard, ModuleAccessGuard, PermissionGuard)
@RequireModule('clients')
export class IconsController {
  constructor(private readonly iconsService: ClientIconsService) {}

  // ============================================
  // ROUTES WITH LITERAL PATHS (must come first)
  // ============================================

  /**
   * Get all icons for the company.
   */
  @Get()
  @ApiOperation({
    summary: 'Get all icons',
    description:
      "Retrieves a paginated list of icons defined for the authenticated user's company. " +
      'Icons can be of three types: Lucide icons, custom uploaded images, or emoji. ' +
      'Each icon may have an auto-assign condition for automatic assignment to clients matching specific criteria.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of icons with their configuration',
    type: PaginatedIconsResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
    type: ClientErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User lacks read permission for clients module',
    type: ClientErrorResponseDto,
  })
  @RequirePermission('clients', 'read')
  async findAll(@CurrentUser() user: User, @Query() query: IconQueryDto) {
    return this.iconsService.findAllIcons(user, query);
  }

  /**
   * Get icons assigned to a specific client.
   */
  @Get('client/:clientId')
  @ApiOperation({
    summary: 'Get icons assigned to a client',
    description:
      'Retrieves all icons currently assigned to a specific client, including both ' +
      'manually assigned icons and icons assigned via auto-assign rules. ' +
      'The response includes assignment metadata such as whether each icon was auto-assigned.',
  })
  @ApiParam({
    name: 'clientId',
    type: 'string',
    format: 'uuid',
    description: 'Unique identifier of the client',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'List of icons assigned to the client with assignment details',
    type: [IconAssignmentResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
    type: ClientErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User lacks read permission or client belongs to different company',
    type: ClientErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Client not found',
    type: ClientErrorResponseDto,
  })
  @RequirePermission('clients', 'read')
  async getClientIcons(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @CurrentUser() user: User
  ) {
    return this.iconsService.getClientIcons(clientId, user);
  }

  /**
   * Manually assign an icon to a client.
   */
  @Post('assign')
  @ApiOperation({
    summary: 'Assign an icon to a client',
    description:
      'Manually assigns an icon to a client. This creates a manual assignment that ' +
      'will not be affected by auto-assign rule changes. Both the icon and client must ' +
      "belong to the authenticated user's company.",
  })
  @ApiResponse({
    status: 201,
    description: 'Icon successfully assigned to the client',
    type: IconAssignmentResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Icon is already assigned to the client',
    type: ClientErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
    type: ClientErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User lacks write permission for clients module',
    type: ClientErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Icon or client not found',
    type: ClientErrorResponseDto,
  })
  @RequirePermission('clients', 'write')
  async assignIcon(@Body() dto: AssignIconDto, @CurrentUser() user: User) {
    return this.iconsService.assignIcon(dto, user);
  }

  /**
   * Unassign an icon from a client.
   */
  @Delete('unassign/:clientId/:iconId')
  @ApiOperation({
    summary: 'Unassign an icon from a client',
    description:
      'Removes an icon assignment from a client. This works for both manual and ' +
      'auto-assigned icons. Note that if an auto-assign rule still matches the client, ' +
      'the icon may be re-assigned during the next auto-assign evaluation.',
  })
  @ApiParam({
    name: 'clientId',
    type: 'string',
    format: 'uuid',
    description: 'Unique identifier of the client',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiParam({
    name: 'iconId',
    type: 'string',
    format: 'uuid',
    description: 'Unique identifier of the icon to unassign',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiResponse({
    status: 200,
    description: 'Icon successfully unassigned from the client',
    type: ClientSuccessResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
    type: ClientErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User lacks write permission for clients module',
    type: ClientErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Assignment not found - icon is not assigned to this client',
    type: ClientErrorResponseDto,
  })
  @RequirePermission('clients', 'write')
  async unassignIcon(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Param('iconId', ParseUUIDPipe) iconId: string,
    @CurrentUser() user: User
  ) {
    await this.iconsService.unassignIcon(clientId, iconId, user);
    return { message: 'Icon unassigned successfully' };
  }

  // ============================================
  // ROUTES WITH PARAMETERIZED PATHS
  // ============================================

  /**
   * Get presigned URL for a custom icon file.
   */
  @Get(':id/url')
  @ApiOperation({
    summary: 'Get icon file URL',
    description:
      'Retrieves a presigned URL for accessing a custom icon file. ' +
      'This endpoint is primarily used for icons of type "custom" that have uploaded image files. ' +
      'The URL is temporarily valid and can be used to display the icon in the UI.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Unique identifier of the icon',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Presigned URL for the icon file',
    type: IconUrlResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
    type: ClientErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User lacks read permission or icon belongs to different company',
    type: ClientErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Icon not found or icon has no uploaded file',
    type: ClientErrorResponseDto,
  })
  @RequirePermission('clients', 'read')
  async getUrl(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    const url = await this.iconsService.getIconUrl(id, user);
    return { url };
  }

  /**
   * Get a specific icon by ID.
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get an icon by ID',
    description:
      'Retrieves detailed information about a specific icon including its type, ' +
      'configuration, and auto-assign condition if defined. The icon must belong to ' +
      "the authenticated user's company.",
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Unique identifier of the icon',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Icon details including type, color, and auto-assign configuration',
    type: IconResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
    type: ClientErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User lacks read permission or icon belongs to different company',
    type: ClientErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Icon not found',
    type: ClientErrorResponseDto,
  })
  @RequirePermission('clients', 'read')
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.iconsService.findIconById(id, user);
  }

  /**
   * Create a new icon (Owner/Admin only).
   */
  @Post()
  @ApiOperation({
    summary: 'Create a new icon',
    description:
      'Creates a new icon for the company. This endpoint is restricted to Company Owners and Admins. ' +
      'Icons can be one of three types:\n' +
      '- **lucide**: Use a Lucide icon name (e.g., "star", "user", "settings")\n' +
      '- **custom**: Upload a custom image file (PNG, JPEG, GIF, WebP, max 2MB)\n' +
      '- **emoji**: Use an emoji character directly\n\n' +
      'An optional auto-assign condition can be provided as a JSON object to automatically ' +
      'assign this icon to clients matching specific criteria.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Icon display name',
          example: 'VIP Client',
        },
        color: {
          type: 'string',
          description: 'Icon color in hex format',
          example: '#FF5733',
        },
        iconType: {
          type: 'string',
          enum: ['lucide', 'custom', 'emoji'],
          description: 'Type of icon',
          example: 'lucide',
        },
        iconValue: {
          type: 'string',
          description: 'Icon value (lucide icon name, emoji, or custom identifier)',
          example: 'star',
        },
        tooltip: {
          type: 'string',
          description: 'Tooltip text displayed on hover',
          example: 'VIP client with premium support',
        },
        autoAssignCondition: {
          type: 'string',
          description: 'JSON string with auto-assign condition for automatic icon assignment',
          example:
            '{"type":"AND","conditions":[{"field":"vatStatus","operator":"equals","value":"VAT_MONTHLY"}]}',
        },
        file: {
          type: 'string',
          format: 'binary',
          description: 'Custom icon image file (for iconType="custom")',
        },
      },
      required: ['name'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Icon successfully created',
    type: IconResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid file type or validation error',
    type: ClientErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
    type: ClientErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only Company Owners and Admins can create icons',
    type: ClientErrorResponseDto,
  })
  @ApiResponse({
    status: 429,
    description: 'Too many icon upload attempts. Please try again later.',
    type: ClientErrorResponseDto,
  })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @UseGuards(OwnerOrAdminGuard)
  @OwnerOrAdmin()
  @RequirePermission('clients', 'write')
  @UseInterceptors(FileInterceptor('file', multerOptions))
  async create(
    @Body() dto: CreateIconDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: User
  ) {
    return this.iconsService.createIcon(dto, file, user);
  }

  /**
   * Update an existing icon (Owner/Admin only).
   */
  @Put(':id')
  @ApiOperation({
    summary: 'Update an icon',
    description:
      'Updates an existing icon configuration. This endpoint is restricted to Company Owners and Admins. ' +
      'All fields are optional - only provided fields will be updated. ' +
      'To remove an auto-assign condition, pass autoAssignCondition as null. ' +
      'When updating a custom icon, you can upload a new file to replace the existing one.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Unique identifier of the icon to update',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Icon display name',
          example: 'Premium Client',
        },
        color: {
          type: 'string',
          description: 'Icon color in hex format',
          example: '#00FF00',
        },
        iconType: {
          type: 'string',
          enum: ['lucide', 'custom', 'emoji'],
          description: 'Type of icon',
        },
        iconValue: {
          type: 'string',
          description: 'Icon value (lucide icon name, emoji, or custom identifier)',
        },
        tooltip: {
          type: 'string',
          description: 'Tooltip text displayed on hover',
        },
        autoAssignCondition: {
          type: 'string',
          description: 'JSON string with auto-assign condition (pass "null" to remove)',
        },
        file: {
          type: 'string',
          format: 'binary',
          description: 'New custom icon image file (replaces existing)',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Icon successfully updated',
    type: IconResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid file type or validation error',
    type: ClientErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
    type: ClientErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only Company Owners and Admins can update icons',
    type: ClientErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Icon not found',
    type: ClientErrorResponseDto,
  })
  @UseGuards(OwnerOrAdminGuard)
  @OwnerOrAdmin()
  @RequirePermission('clients', 'write')
  @UseInterceptors(FileInterceptor('file', multerOptions))
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateIconDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: User
  ) {
    return this.iconsService.updateIcon(id, dto, file, user);
  }

  /**
   * Delete an icon (Owner/Admin only).
   */
  @Delete(':id')
  @ApiOperation({
    summary: 'Delete an icon',
    description:
      'Deletes an icon and all its client assignments. This endpoint is restricted to Company Owners and Admins. ' +
      'Warning: This operation will remove the icon from all clients it is currently assigned to. ' +
      'If the icon has an uploaded file, the file will also be deleted from storage.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Unique identifier of the icon to delete',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Icon successfully deleted',
    type: ClientSuccessResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
    type: ClientErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only Company Owners and Admins can delete icons',
    type: ClientErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Icon not found',
    type: ClientErrorResponseDto,
  })
  @UseGuards(OwnerOrAdminGuard)
  @OwnerOrAdmin()
  @RequirePermission('clients', 'delete')
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    await this.iconsService.removeIcon(id, user);
    return { message: 'Icon deleted successfully' };
  }
}
