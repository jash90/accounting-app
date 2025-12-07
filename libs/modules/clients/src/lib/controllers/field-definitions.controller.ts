import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CurrentUser, Roles, RolesGuard } from '@accounting/auth';
import { User, UserRole } from '@accounting/common';
import { CustomFieldsService } from '../services/custom-fields.service';
import {
  CreateFieldDefinitionDto,
  UpdateFieldDefinitionDto,
} from '../dto/field-definition.dto';

@ApiTags('Client Field Definitions')
@ApiBearerAuth()
@Controller('clients/field-definitions')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
export class FieldDefinitionsController {
  constructor(private readonly customFieldsService: CustomFieldsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all field definitions' })
  @ApiResponse({ status: 200, description: 'List of field definitions' })
  async findAll(@CurrentUser() user: User) {
    return this.customFieldsService.findAllDefinitions(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a field definition by ID' })
  @ApiResponse({ status: 200, description: 'Field definition details' })
  @ApiResponse({ status: 404, description: 'Field definition not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.customFieldsService.findDefinitionById(id, user);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new field definition' })
  @ApiResponse({ status: 201, description: 'Field definition created' })
  async create(
    @Body() dto: CreateFieldDefinitionDto,
    @CurrentUser() user: User,
  ) {
    return this.customFieldsService.createDefinition(dto, user);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a field definition' })
  @ApiResponse({ status: 200, description: 'Field definition updated' })
  @ApiResponse({ status: 404, description: 'Field definition not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFieldDefinitionDto,
    @CurrentUser() user: User,
  ) {
    return this.customFieldsService.updateDefinition(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a field definition' })
  @ApiResponse({ status: 200, description: 'Field definition deleted' })
  @ApiResponse({ status: 404, description: 'Field definition not found' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    await this.customFieldsService.removeDefinition(id, user);
    return { message: 'Field definition deleted successfully' };
  }
}
