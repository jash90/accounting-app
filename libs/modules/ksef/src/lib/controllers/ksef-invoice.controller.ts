import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
  CreateKsefInvoiceDto,
  GetKsefInvoicesQueryDto,
  KsefBatchSubmitResultDto,
  KsefInvoiceResponseDto,
  KsefInvoiceStatusDto,
  KsefInvoiceValidateResultDto,
  UpdateKsefInvoiceDto,
} from '../dto';
import { KsefInvoiceService } from '../services/ksef-invoice.service';

@ApiTags('KSeF - Invoices')
@ApiBearerAuth('JWT-auth')
@Controller('modules/ksef/invoices')
@UseGuards(JwtAuthGuard, ModuleAccessGuard, PermissionGuard)
@RequireModule('ksef')
export class KsefInvoiceController {
  constructor(private readonly invoiceService: KsefInvoiceService) {}

  @Get()
  @ApiOperation({
    summary: 'List KSeF invoices',
    description:
      'Returns a paginated list of KSeF invoices with optional filters and sorting.',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of invoices' })
  @RequirePermission('ksef', 'read')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async findAll(
    @Query() query: GetKsefInvoicesQueryDto,
    @CurrentUser() user: User,
  ) {
    return this.invoiceService.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get KSeF invoice details',
    description: 'Returns the details of a single KSeF invoice.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: KsefInvoiceResponseDto })
  @RequirePermission('ksef', 'read')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<KsefInvoiceResponseDto> {
    return this.invoiceService.findOne(id, user);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a draft invoice',
    description:
      'Creates a new draft KSeF invoice. The invoice is not sent to KSeF until explicitly submitted.',
  })
  @ApiResponse({ status: 201, type: KsefInvoiceResponseDto })
  @RequirePermission('ksef', 'write')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async create(
    @Body() dto: CreateKsefInvoiceDto,
    @CurrentUser() user: User,
  ): Promise<KsefInvoiceResponseDto> {
    return this.invoiceService.createDraft(dto, user);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a draft invoice',
    description: 'Updates an existing draft KSeF invoice. Only drafts can be updated.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: KsefInvoiceResponseDto })
  @RequirePermission('ksef', 'write')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateKsefInvoiceDto,
    @CurrentUser() user: User,
  ): Promise<KsefInvoiceResponseDto> {
    return this.invoiceService.updateDraft(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete an invoice',
    description:
      'Hard-deletes a local KSeF invoice. Allowed only for statuses that have NOT been irrevocably written to KSeF: DRAFT, PENDING_SUBMISSION, REJECTED, ERROR. Submitted/Accepted invoices cannot be deleted to avoid silent reconciliation gaps.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204 })
  @RequirePermission('ksef', 'delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this.invoiceService.deleteInvoice(id, user);
  }

  @Post(':id/validate')
  @ApiOperation({
    summary: 'Validate invoice semantics',
    description:
      'Runs semantic validation on the invoice (NIP checksums, VAT calculations, required fields, dates). Returns validation result without changing invoice status.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Validation result with issues list' })
  @RequirePermission('ksef', 'read')
  async validate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.invoiceService.validateInvoice(id, user);
  }

  @Post(':id/validate-xml')
  @ApiOperation({
    summary: 'Validate invoice XML against KSeF schema',
    description:
      'Sends the invoice XML to the KSeF ksefInvoiceValidate API for schema validation. Returns whether the XML is valid according to FA(3) schema.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'KSeF XML validation result', type: KsefInvoiceValidateResultDto })
  @RequirePermission('ksef', 'read')
  async validateXml(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<KsefInvoiceValidateResultDto> {
    return this.invoiceService.validateXmlWithKsef(id, user);
  }

  @Post(':id/generate-xml')
  @ApiOperation({
    summary: 'Generate XML for an invoice',
    description:
      'Generates the KSeF-compliant XML representation for the invoice.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: KsefInvoiceResponseDto })
  @RequirePermission('ksef', 'write')
  async generateXml(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<KsefInvoiceResponseDto> {
    return this.invoiceService.generateXml(id, user);
  }

  @Post(':id/submit')
  @ApiOperation({
    summary: 'Submit an invoice to KSeF',
    description:
      'Encrypts and submits the invoice to the KSeF system. Opens a session if needed.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: KsefInvoiceResponseDto })
  @RequirePermission('ksef', 'write')
  async submit(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<KsefInvoiceResponseDto> {
    return this.invoiceService.submitInvoice(id, user);
  }

  @Post('batch-submit')
  @ApiOperation({
    summary: 'Submit multiple invoices to KSeF',
    description: 'Submits multiple invoices sequentially and returns a batch result.',
  })
  @ApiResponse({ status: 200, type: KsefBatchSubmitResultDto })
  @RequirePermission('ksef', 'write')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async batchSubmit(
    @Body() body: { ids: string[] },
    @CurrentUser() user: User,
  ): Promise<KsefBatchSubmitResultDto> {
    return this.invoiceService.submitBatch(body.ids, user);
  }

  @Post('batch-delete')
  @ApiOperation({
    summary: 'Delete multiple invoices',
    description:
      'Hard-deletes multiple invoices in one call. Each id is processed independently — a single failure (e.g. trying to delete an ACCEPTED invoice) does not abort the rest. Allowed statuses match the single-id DELETE endpoint: DRAFT, PENDING_SUBMISSION, REJECTED, ERROR.',
  })
  @ApiResponse({ status: 200, description: 'Batch result with per-id success/error' })
  @RequirePermission('ksef', 'delete')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async batchDelete(
    @Body() body: { ids: string[] },
    @CurrentUser() user: User,
  ): Promise<{
    totalCount: number;
    successCount: number;
    failedCount: number;
    results: Array<{ invoiceId: string; success: boolean; errorMessage?: string }>;
  }> {
    return this.invoiceService.deleteBatch(body.ids, user);
  }

  @Get(':id/status')
  @ApiOperation({
    summary: 'Get invoice KSeF status',
    description: 'Returns the current KSeF processing status for an invoice.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: KsefInvoiceStatusDto })
  @RequirePermission('ksef', 'read')
  async getStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<KsefInvoiceStatusDto> {
    return this.invoiceService.getInvoiceStatus(id, user);
  }
}
