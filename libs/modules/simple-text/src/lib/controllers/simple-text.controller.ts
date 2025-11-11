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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Get all texts for user company' })
  @ApiResponse({ status: 200, type: [SimpleTextResponseDto] })
  @ApiResponse({ status: 403, description: 'No access to module or no read permission' })
  findAll(@CurrentUser() user: User) {
    return this.simpleTextService.findAll(user);
  }

  @Get(':id')
  @RequirePermission('simple-text', 'read')
  @ApiOperation({ summary: 'Get text by ID' })
  @ApiResponse({ status: 200, type: SimpleTextResponseDto })
  @ApiResponse({ status: 403, description: 'No access to module or no read permission' })
  @ApiResponse({ status: 404, description: 'Text not found' })
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.simpleTextService.findOne(id, user);
  }

  @Post()
  @RequirePermission('simple-text', 'write')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new text' })
  @ApiResponse({ status: 201, type: SimpleTextResponseDto })
  @ApiResponse({ status: 403, description: 'No write permission' })
  create(@Body() createSimpleTextDto: CreateSimpleTextDto, @CurrentUser() user: User) {
    return this.simpleTextService.create(createSimpleTextDto, user);
  }

  @Patch(':id')
  @RequirePermission('simple-text', 'write')
  @ApiOperation({ summary: 'Update text' })
  @ApiResponse({ status: 200, type: SimpleTextResponseDto })
  @ApiResponse({ status: 403, description: 'No write permission' })
  @ApiResponse({ status: 404, description: 'Text not found' })
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
  @ApiOperation({ summary: 'Delete text' })
  @ApiResponse({ status: 204, description: 'Text deleted successfully' })
  @ApiResponse({ status: 403, description: 'No delete permission' })
  @ApiResponse({ status: 404, description: 'Text not found' })
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.simpleTextService.remove(id, user);
  }
}

