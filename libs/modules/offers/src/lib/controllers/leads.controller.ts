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
  UseGuards,
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

import { CurrentUser, JwtAuthGuard } from '@accounting/auth';
import { User } from '@accounting/common';
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
@RequireModule('offers')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

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
  async convertToClient(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConvertLeadToClientDto,
    @CurrentUser() user: User
  ) {
    return this.leadsService.convertToClient(id, dto, user);
  }
}
