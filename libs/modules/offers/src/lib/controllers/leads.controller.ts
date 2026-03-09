import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { Response } from 'express';

import { CurrentUser, JwtAuthGuard } from '@accounting/auth';
import { ApiCsvResponse, NotificationType, User } from '@accounting/common';
import { sendCsvResponse } from '@accounting/common/backend';
import { NotificationInterceptor, NotifyOn } from '@accounting/modules/notifications';
import {
  ModuleAccessGuard,
  PermissionGuard,
  RequireModule,
  RequirePermission,
} from '@accounting/rbac';

import {
  ConvertLeadToClientDto,
  CreateLeadDto,
  LeadFiltersDto,
  UpdateLeadDto,
} from '../dto/lead.dto';
import {
  LeadResponseDto,
  LeadStatisticsDto,
  OfferErrorResponseDto,
  OfferSuccessResponseDto,
  PaginatedLeadsResponseDto,
} from '../dto/offer-response.dto';
import { LeadsService } from '../services/leads.service';
import { OfferExportService } from '../services/offer-export.service';

@ApiTags('Offers - Leads')
@ApiBearerAuth()
@ApiExtraModels(
  LeadResponseDto,
  PaginatedLeadsResponseDto,
  LeadStatisticsDto,
  OfferErrorResponseDto,
  OfferSuccessResponseDto
)
@Controller('modules/offers/leads')
@UseGuards(JwtAuthGuard, ModuleAccessGuard, PermissionGuard)
@UseInterceptors(NotificationInterceptor)
@RequireModule('offers')
export class LeadsController {
  constructor(
    private readonly leadsService: LeadsService,
    private readonly offerExportService: OfferExportService
  ) {}

  // eslint-disable-next-line @darraghor/nestjs-typed/api-method-should-specify-api-response
  @Get('export')
  @ApiOperation({
    summary: 'Export leads to CSV',
    description: 'Exports all leads matching the current filters to a CSV file.',
  })
  @ApiCsvResponse()
  @RequirePermission('offers', 'read')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async exportToCsv(
    @Query() filters: LeadFiltersDto,
    @CurrentUser() user: User,
    @Res() res: Response
  ) {
    const csvBuffer = await this.offerExportService.exportLeadsToCsv(filters, user);
    sendCsvResponse(res, csvBuffer, 'leads-export');
  }

  @Get()
  @ApiOperation({
    summary: 'Get all leads',
    description: 'Retrieves a paginated list of leads with optional filtering.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of leads',
    type: PaginatedLeadsResponseDto,
  })
  @RequirePermission('offers', 'read')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async findAll(@CurrentUser() user: User, @Query() filters: LeadFiltersDto) {
    return this.leadsService.findAll(user, filters);
  }

  @Get('statistics')
  @ApiOperation({
    summary: 'Get lead statistics',
    description: 'Retrieves statistics about leads by status.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lead statistics',
    type: LeadStatisticsDto,
  })
  @RequirePermission('offers', 'read')
  async getStatistics(@CurrentUser() user: User) {
    return this.leadsService.getStatistics(user);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a lead by ID',
    description: 'Retrieves detailed information about a specific lead.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Lead details',
    type: LeadResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Lead not found',
    type: OfferErrorResponseDto,
  })
  @RequirePermission('offers', 'read')
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.leadsService.findOne(id, user);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new lead',
    description: 'Creates a new lead (potential client).',
  })
  @ApiResponse({
    status: 201,
    description: 'Lead created successfully',
    type: LeadResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
    type: OfferErrorResponseDto,
  })
  @RequirePermission('offers', 'write')
  @NotifyOn({
    type: NotificationType.LEAD_CREATED,
    titleTemplate: '{{actor.firstName}} utworzył(a) lead "{{companyName}}"',
    messageTemplate: 'Nowy lead został utworzony',
    actionUrlTemplate: '/modules/offers/leads?leadId={{id}}',
    recipientResolver: 'companyUsersExceptActor',
  })
  async create(@Body() dto: CreateLeadDto, @CurrentUser() user: User) {
    return this.leadsService.create(dto, user);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a lead',
    description: 'Updates an existing lead with partial data.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Lead updated successfully',
    type: LeadResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or lead already converted',
    type: OfferErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Lead not found',
    type: OfferErrorResponseDto,
  })
  @RequirePermission('offers', 'write')
  @NotifyOn({
    type: NotificationType.LEAD_UPDATED,
    titleTemplate: '{{actor.firstName}} zaktualizował(a) lead "{{companyName}}"',
    actionUrlTemplate: '/modules/offers/leads?leadId={{id}}',
    recipientResolver: 'companyUsersExceptActor',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLeadDto,
    @CurrentUser() user: User
  ) {
    return this.leadsService.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a lead',
    description: 'Permanently deletes a lead.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Lead deleted successfully',
    type: OfferSuccessResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Lead not found',
    type: OfferErrorResponseDto,
  })
  @RequirePermission('offers', 'delete')
  @NotifyOn({
    type: NotificationType.LEAD_DELETED,
    titleTemplate: '{{actor.firstName}} usunął/usunęła lead',
    recipientResolver: 'companyUsersExceptActor',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    await this.leadsService.remove(id, user);
    return { message: 'Lead usunięty pomyślnie' };
  }

  @Post(':id/convert-to-client')
  @ApiOperation({
    summary: 'Convert lead to client',
    description: 'Converts a lead to a client in the clients module.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Lead converted to client successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Lead already converted',
    type: OfferErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Lead not found',
    type: OfferErrorResponseDto,
  })
  @RequirePermission('offers', 'write')
  @NotifyOn({
    type: NotificationType.LEAD_CONVERTED,
    titleTemplate: '{{actor.firstName}} przekonwertował(a) lead na klienta',
    actionUrlTemplate: '/modules/offers/leads?leadId={{id}}',
    recipientResolver: 'companyUsersExceptActor',
  })
  async convertToClient(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConvertLeadToClientDto,
    @CurrentUser() user: User
  ) {
    return this.leadsService.convertToClient(id, dto, user);
  }
}
