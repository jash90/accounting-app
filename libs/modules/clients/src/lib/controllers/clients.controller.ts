import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard, CurrentUser } from '@accounting/auth';
import { ModuleAccessGuard, PermissionGuard, RequireModule, RequirePermission } from '@accounting/rbac';
import { User } from '@accounting/common';
import { ClientsService } from '../services/clients.service';
import { CustomFieldsService } from '../services/custom-fields.service';
import { ClientChangelogService } from '../services/client-changelog.service';
import {
  CreateClientDto,
  UpdateClientDto,
  ClientFiltersDto,
  SetClientIconsDto,
  SetCustomFieldValuesDto,
} from '../dto/client.dto';

@ApiTags('Clients')
@ApiBearerAuth()
@Controller('modules/clients')
@UseGuards(JwtAuthGuard, ModuleAccessGuard, PermissionGuard)
@RequireModule('clients')
export class ClientsController {
  constructor(
    private readonly clientsService: ClientsService,
    private readonly customFieldsService: CustomFieldsService,
    private readonly clientChangelogService: ClientChangelogService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all clients' })
  @ApiResponse({ status: 200, description: 'List of clients' })
  @RequirePermission('clients', 'read')
  async findAll(@CurrentUser() user: User, @Query() filters: ClientFiltersDto) {
    return this.clientsService.findAll(user, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a client by ID' })
  @ApiResponse({ status: 200, description: 'Client details' })
  @ApiResponse({ status: 404, description: 'Client not found' })
  @RequirePermission('clients', 'read')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.clientsService.findOne(id, user);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new client' })
  @ApiResponse({ status: 201, description: 'Client created' })
  @RequirePermission('clients', 'write')
  async create(@Body() dto: CreateClientDto, @CurrentUser() user: User) {
    return this.clientsService.create(dto, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a client' })
  @ApiResponse({ status: 200, description: 'Client updated' })
  @ApiResponse({ status: 404, description: 'Client not found' })
  @RequirePermission('clients', 'write')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClientDto,
    @CurrentUser() user: User,
  ) {
    return this.clientsService.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a client (soft delete)' })
  @ApiResponse({ status: 200, description: 'Client deleted' })
  @ApiResponse({ status: 404, description: 'Client not found' })
  @RequirePermission('clients', 'delete')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    await this.clientsService.remove(id, user);
    return { message: 'Client deleted successfully' };
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Restore a deleted client' })
  @ApiResponse({ status: 200, description: 'Client restored' })
  @ApiResponse({ status: 404, description: 'Client not found' })
  @RequirePermission('clients', 'write')
  async restore(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.clientsService.restore(id, user);
  }

  @Get(':id/changelog')
  @ApiOperation({ summary: 'Get client change log' })
  @ApiResponse({ status: 200, description: 'Client changelog' })
  @RequirePermission('clients', 'read')
  async getChangelog(@Param('id', ParseUUIDPipe) id: string) {
    return this.clientChangelogService.getClientChangelog(id);
  }

  @Get(':id/custom-fields')
  @ApiOperation({ summary: 'Get client custom field values' })
  @ApiResponse({ status: 200, description: 'Custom field values' })
  @RequirePermission('clients', 'read')
  async getCustomFields(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.customFieldsService.getClientCustomFields(id, user);
  }

  @Put(':id/custom-fields')
  @ApiOperation({ summary: 'Set client custom field values' })
  @ApiResponse({ status: 200, description: 'Custom fields updated' })
  @RequirePermission('clients', 'write')
  async setCustomFields(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetCustomFieldValuesDto,
    @CurrentUser() user: User,
  ) {
    return this.customFieldsService.setMultipleCustomFieldValues(
      id,
      dto.values,
      user,
    );
  }

  @Put(':id/icons')
  @ApiOperation({ summary: 'Set client icons' })
  @ApiResponse({ status: 200, description: 'Icons updated' })
  @RequirePermission('clients', 'write')
  async setIcons(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetClientIconsDto,
    @CurrentUser() user: User,
  ) {
    // Import ClientIconsService in the constructor if needed
    // For now, icons can be managed via the separate icons controller
    return { message: 'Use /clients/icons endpoint to manage icons' };
  }
}
