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
import { User } from '@accounting/common';
import {
  ModuleAccessGuard,
  PermissionGuard,
  RequireModule,
  RequirePermission,
} from '@accounting/rbac';

import {
  OfferActivityResponseDto,
  OfferErrorResponseDto,
  OfferResponseDto,
  OfferStatisticsDto,
  OfferSuccessResponseDto,
  PaginatedOffersResponseDto,
} from '../dto/offer-response.dto';
import {
  CreateOfferDto,
  DuplicateOfferDto,
  OfferFiltersDto,
  SendOfferDto,
  UpdateOfferDto,
  UpdateOfferStatusDto,
} from '../dto/offer.dto';
import { OffersService } from '../services/offers.service';

@ApiTags('Offers')
@ApiBearerAuth()
@ApiExtraModels(
  OfferResponseDto,
  PaginatedOffersResponseDto,
  OfferActivityResponseDto,
  OfferStatisticsDto,
  OfferErrorResponseDto,
  OfferSuccessResponseDto
)
@Controller('modules/offers')
@UseGuards(JwtAuthGuard, ModuleAccessGuard, PermissionGuard)
@RequireModule('offers')
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all offers',
    description: 'Retrieves a paginated list of offers with optional filtering.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of offers',
    type: PaginatedOffersResponseDto,
  })
  @RequirePermission('offers', 'read')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async findAll(@CurrentUser() user: User, @Query() filters: OfferFiltersDto) {
    return this.offersService.findAll(user, filters);
  }

  @Get('statistics')
  @ApiOperation({
    summary: 'Get offer statistics',
    description: 'Retrieves statistics about offers by status and value.',
  })
  @ApiResponse({
    status: 200,
    description: 'Offer statistics',
    type: OfferStatisticsDto,
  })
  @RequirePermission('offers', 'read')
  async getStatistics(@CurrentUser() user: User) {
    return this.offersService.getStatistics(user);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get an offer by ID',
    description: 'Retrieves detailed information about a specific offer.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Offer details',
    type: OfferResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Offer not found',
    type: OfferErrorResponseDto,
  })
  @RequirePermission('offers', 'read')
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.offersService.findOne(id, user);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new offer',
    description: 'Creates a new offer for a client or lead.',
  })
  @ApiResponse({
    status: 201,
    description: 'Offer created successfully',
    type: OfferResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or no recipient specified',
    type: OfferErrorResponseDto,
  })
  @RequirePermission('offers', 'write')
  async create(@Body() dto: CreateOfferDto, @CurrentUser() user: User) {
    return this.offersService.create(dto, user);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update an offer',
    description:
      'Updates an existing offer with partial data. Only DRAFT and READY offers can be modified.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Offer updated successfully',
    type: OfferResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or offer cannot be modified',
    type: OfferErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Offer not found',
    type: OfferErrorResponseDto,
  })
  @RequirePermission('offers', 'write')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOfferDto,
    @CurrentUser() user: User
  ) {
    return this.offersService.update(id, dto, user);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Update offer status',
    description: 'Changes the status of an offer. Only valid transitions are allowed.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Status updated successfully',
    type: OfferResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid status transition',
    type: OfferErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Offer not found',
    type: OfferErrorResponseDto,
  })
  @RequirePermission('offers', 'write')
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOfferStatusDto,
    @CurrentUser() user: User
  ) {
    return this.offersService.updateStatus(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete an offer',
    description: 'Permanently deletes an offer and its generated documents.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Offer deleted successfully',
    type: OfferSuccessResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Offer not found',
    type: OfferErrorResponseDto,
  })
  @RequirePermission('offers', 'delete')
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    await this.offersService.remove(id, user);
    return { message: 'Oferta usunięta pomyślnie' };
  }

  @Post(':id/generate-document')
  @ApiOperation({
    summary: 'Generate offer document',
    description: 'Generates a DOCX document for the offer using the assigned template.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Document generated successfully',
    type: OfferResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Document generation failed',
    type: OfferErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Offer not found',
    type: OfferErrorResponseDto,
  })
  @RequirePermission('offers', 'write')
  async generateDocument(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.offersService.generateDocument(id, user);
  }

  @Get(':id/download-document')
  @ApiOperation({
    summary: 'Download offer document',
    description: 'Downloads the generated DOCX document for the offer.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'File download',
    content: {
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
        schema: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Offer or document not found',
    type: OfferErrorResponseDto,
  })
  @RequirePermission('offers', 'read')
  async downloadDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Res() res: Response
  ) {
    const { buffer, fileName } = await this.offersService.downloadDocument(id, user);

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
    });
    res.send(buffer);
  }

  @Post(':id/send')
  @ApiOperation({
    summary: 'Send offer via email',
    description: 'Sends the offer document via email to the specified recipient.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Offer sent successfully',
    type: OfferResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Email sending failed or document not generated',
    type: OfferErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Offer not found',
    type: OfferErrorResponseDto,
  })
  @RequirePermission('offers', 'write')
  async sendOffer(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendOfferDto,
    @CurrentUser() user: User
  ) {
    return this.offersService.sendOffer(id, dto, user);
  }

  @Post(':id/duplicate')
  @ApiOperation({
    summary: 'Duplicate an offer',
    description: 'Creates a copy of an offer with a new number and optionally different recipient.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 201,
    description: 'Offer duplicated successfully',
    type: OfferResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Offer not found',
    type: OfferErrorResponseDto,
  })
  @RequirePermission('offers', 'write')
  async duplicate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DuplicateOfferDto,
    @CurrentUser() user: User
  ) {
    return this.offersService.duplicate(id, dto, user);
  }

  @Get(':id/activities')
  @ApiOperation({
    summary: 'Get offer activities',
    description: 'Retrieves the activity history for an offer.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'List of activities',
    type: [OfferActivityResponseDto],
  })
  @ApiResponse({
    status: 404,
    description: 'Offer not found',
    type: OfferErrorResponseDto,
  })
  @RequirePermission('offers', 'read')
  async getActivities(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.offersService.getActivities(id, user);
  }
}
