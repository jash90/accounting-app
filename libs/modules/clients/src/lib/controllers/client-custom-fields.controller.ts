import { Body, Controller, Get, Param, ParseUUIDPipe, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser, JwtAuthGuard } from '@accounting/auth';
import { User } from '@accounting/common';
import {
  ModuleAccessGuard,
  PermissionGuard,
  RequireModule,
  RequirePermission,
} from '@accounting/rbac';

import { ClientErrorResponseDto, CustomFieldValueResponseDto } from '../dto/client-response.dto';
import { SetCustomFieldValuesDto } from '../dto/client.dto';
import { CustomFieldsService } from '../services/custom-fields.service';

@ApiTags('Clients')
@ApiBearerAuth('JWT-auth')
@Controller('modules/clients')
@UseGuards(JwtAuthGuard, ModuleAccessGuard, PermissionGuard)
@RequireModule('clients')
export class ClientCustomFieldsController {
  constructor(private readonly customFieldsService: CustomFieldsService) {}

  @Get(':id/custom-fields')
  @ApiOperation({
    summary: 'Get client custom field values',
    description: 'Retrieves all custom field values for a specific client.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'Client ID' })
  @ApiResponse({
    status: 200,
    description: 'Custom field values',
    type: [CustomFieldValueResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized', type: ClientErrorResponseDto })
  @RequirePermission('clients', 'read')
  async getCustomFields(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.customFieldsService.getClientCustomFields(id, user);
  }

  @Put(':id/custom-fields')
  @ApiOperation({
    summary: 'Set client custom field values',
    description:
      'Sets or updates multiple custom field values for a client in a single request. ' +
      'Pass null as the value to clear a custom field.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'Client ID' })
  @ApiResponse({
    status: 200,
    description: 'Custom fields updated',
    type: [CustomFieldValueResponseDto],
  })
  @ApiResponse({ status: 400, description: 'Validation error', type: ClientErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Client not found', type: ClientErrorResponseDto })
  @RequirePermission('clients', 'write')
  async setCustomFields(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetCustomFieldValuesDto,
    @CurrentUser() user: User
  ) {
    return this.customFieldsService.setMultipleCustomFieldValues(id, dto.values, user);
  }
}
