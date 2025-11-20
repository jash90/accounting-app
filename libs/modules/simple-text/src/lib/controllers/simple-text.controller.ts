import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { SimpleTextService } from '../services/simple-text.service';
import { CreateSimpleTextDto } from '../dto/create-simple-text.dto';
import { UpdateSimpleTextDto } from '../dto/update-simple-text.dto';
import { SimpleTextResponseDto } from '../dto/simple-text-response.dto';
import { CurrentUser } from '@accounting/auth';
import { User } from '@accounting/common';
import {
  RequireModule,
  RequirePermission,
  ModuleAccessGuard,
  PermissionGuard,
} from '@accounting/rbac';

@ApiTags('simple-text')
@ApiBearerAuth('JWT-auth')
@Controller('modules/simple-text')
@UseGuards(ModuleAccessGuard, PermissionGuard)
@RequireModule('simple-text')
export class SimpleTextController {
  constructor(private readonly simpleTextService: SimpleTextService) {}

  @Get()
  @RequirePermission('simple-text', 'read')
  @ApiOperation({
    summary: 'Get all text entries for user company',
    description: 'Retrieve all simple text entries belonging to the authenticated user\'s company. Requires read permission for the simple-text module.'
  })
  @ApiOkResponse({ description: 'List of text entries retrieved successfully', type: [SimpleTextResponseDto] })
  @ApiForbiddenResponse({ description: 'Forbidden - No access to module or no read permission' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  findAll(@CurrentUser() user: User) {
    return this.simpleTextService.findAll(user);
  }

  @Get(':id')
  @RequirePermission('simple-text', 'read')
  @ApiOperation({
    summary: 'Get text entry by ID',
    description: 'Retrieve a specific simple text entry by its unique identifier. The entry must belong to the user\'s company. Requires read permission.'
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'Text entry unique identifier' })
  @ApiOkResponse({ description: 'Text entry retrieved successfully', type: SimpleTextResponseDto })
  @ApiForbiddenResponse({ description: 'Forbidden - No access to module or no read permission' })
  @ApiNotFoundResponse({ description: 'Text entry not found or does not belong to your company' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.simpleTextService.findOne(id, user);
  }

  @Post()
  @RequirePermission('simple-text', 'write')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create new text entry',
    description: 'Create a new simple text entry for the authenticated user\'s company. The entry will be associated with the user as the creator. Requires write permission.'
  })
  @ApiBody({ type: CreateSimpleTextDto, description: 'Text entry creation data' })
  @ApiCreatedResponse({ description: 'Text entry created successfully', type: SimpleTextResponseDto })
  @ApiForbiddenResponse({ description: 'Forbidden - No write permission for the simple-text module' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  create(@Body() createSimpleTextDto: CreateSimpleTextDto, @CurrentUser() user: User) {
    return this.simpleTextService.create(createSimpleTextDto, user);
  }

  @Patch(':id')
  @RequirePermission('simple-text', 'write')
  @ApiOperation({
    summary: 'Update text entry',
    description: 'Update an existing simple text entry. The entry must belong to the user\'s company. Partial updates are supported. Requires write permission.'
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'Text entry unique identifier' })
  @ApiBody({ type: UpdateSimpleTextDto, description: 'Text entry update data (partial update supported)' })
  @ApiOkResponse({ description: 'Text entry updated successfully', type: SimpleTextResponseDto })
  @ApiForbiddenResponse({ description: 'Forbidden - No write permission for the simple-text module' })
  @ApiNotFoundResponse({ description: 'Text entry not found or does not belong to your company' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  update(
    @Param('id') id: string,
    @Body() updateSimpleTextDto: UpdateSimpleTextDto,
    @CurrentUser() user: User,
  ) {
    return this.simpleTextService.update(id, updateSimpleTextDto, user);
  }

  @Delete(':id')
  @RequirePermission('simple-text', 'delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete text entry',
    description: 'Permanently delete a simple text entry. The entry must belong to the user\'s company. This action cannot be undone. Requires delete permission.'
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'Text entry unique identifier' })
  @ApiNoContentResponse({ description: 'Text entry deleted successfully' })
  @ApiForbiddenResponse({ description: 'Forbidden - No delete permission for the simple-text module' })
  @ApiNotFoundResponse({ description: 'Text entry not found or does not belong to your company' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.simpleTextService.remove(id, user);
  }
}

