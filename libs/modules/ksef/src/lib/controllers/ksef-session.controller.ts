import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';

import { CurrentUser, JwtAuthGuard } from '@accounting/auth';
import { User } from '@accounting/common';
import { SystemCompanyService } from '@accounting/common/backend';
import {
  ModuleAccessGuard,
  PermissionGuard,
  RequireModule,
  RequirePermission,
} from '@accounting/rbac';

import { KsefSessionResponseDto, KsefSessionStatusDto } from '../dto';
import { KsefSessionService } from '../services/ksef-session.service';

@ApiTags('KSeF - Sessions')
@ApiBearerAuth('JWT-auth')
@Controller('modules/ksef/sessions')
@UseGuards(JwtAuthGuard, ModuleAccessGuard, PermissionGuard)
@RequireModule('ksef')
export class KsefSessionController {
  constructor(
    private readonly sessionService: KsefSessionService,
    private readonly systemCompanyService: SystemCompanyService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List KSeF sessions',
    description: 'Returns a paginated list of KSeF sessions for the current company.',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of sessions' })
  @RequirePermission('ksef', 'read')
  async findAll(
    @CurrentUser() user: User,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);
    return this.sessionService.findAll(companyId, page, limit);
  }

  @Get('active')
  @ApiOperation({
    summary: 'Get active KSeF session',
    description: 'Returns the currently active KSeF session, if one exists.',
  })
  @ApiResponse({ status: 200, type: KsefSessionResponseDto })
  @RequirePermission('ksef', 'read')
  async getActive(
    @CurrentUser() user: User,
  ): Promise<KsefSessionResponseDto | null> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);
    const session = await this.sessionService.getActiveSession(companyId);
    if (!session) return null;

    const dto = new KsefSessionResponseDto();
    dto.id = session.id;
    dto.companyId = session.companyId;
    dto.sessionType = session.sessionType;
    dto.ksefSessionRef = session.ksefSessionRef ?? null;
    dto.status = session.status;
    dto.startedAt = session.startedAt.toISOString();
    dto.expiresAt = session.expiresAt?.toISOString() ?? null;
    dto.closedAt = session.closedAt?.toISOString() ?? null;
    dto.invoiceCount = session.invoiceCount;
    dto.upoReference = session.upoReference ?? null;
    dto.errorMessage = session.errorMessage ?? null;
    dto.createdAt = session.createdAt.toISOString();
    return dto;
  }

  @Post('open')
  @ApiOperation({
    summary: 'Open an interactive KSeF session',
    description:
      'Opens a new interactive session with KSeF. Authenticates, generates encryption keys, and registers the session.',
  })
  @ApiResponse({ status: 201, type: KsefSessionResponseDto })
  @RequirePermission('ksef', 'write')
  async open(@CurrentUser() user: User): Promise<KsefSessionResponseDto> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);
    const session = await this.sessionService.openInteractiveSession(
      companyId,
      user.id,
    );

    const dto = new KsefSessionResponseDto();
    dto.id = session.id;
    dto.companyId = session.companyId;
    dto.sessionType = session.sessionType;
    dto.ksefSessionRef = session.ksefSessionRef ?? null;
    dto.status = session.status;
    dto.startedAt = session.startedAt.toISOString();
    dto.expiresAt = session.expiresAt?.toISOString() ?? null;
    dto.closedAt = null;
    dto.invoiceCount = session.invoiceCount;
    dto.upoReference = null;
    dto.errorMessage = null;
    dto.createdAt = session.createdAt.toISOString();
    return dto;
  }

  @Post(':id/close')
  @ApiOperation({
    summary: 'Close a KSeF session',
    description: 'Closes an active KSeF session and retrieves the UPO reference.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: KsefSessionResponseDto })
  @RequirePermission('ksef', 'write')
  async close(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<KsefSessionResponseDto> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);
    const session = await this.sessionService.closeSession(id, companyId, user.id);

    const dto = new KsefSessionResponseDto();
    dto.id = session.id;
    dto.companyId = session.companyId;
    dto.sessionType = session.sessionType;
    dto.ksefSessionRef = session.ksefSessionRef ?? null;
    dto.status = session.status;
    dto.startedAt = session.startedAt.toISOString();
    dto.expiresAt = session.expiresAt?.toISOString() ?? null;
    dto.closedAt = session.closedAt?.toISOString() ?? null;
    dto.invoiceCount = session.invoiceCount;
    dto.upoReference = session.upoReference ?? null;
    dto.errorMessage = session.errorMessage ?? null;
    dto.createdAt = session.createdAt.toISOString();
    return dto;
  }

  @Get(':id/status')
  @ApiOperation({
    summary: 'Get KSeF session status',
    description: 'Returns the current status of a KSeF session, polling KSeF for live data.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: KsefSessionStatusDto })
  @RequirePermission('ksef', 'read')
  async getStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<KsefSessionStatusDto> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);
    return this.sessionService.getSessionStatus(id, companyId, user.id);
  }

  @Get(':id/upo')
  @ApiOperation({
    summary: 'Download UPO for a session',
    description:
      'Returns the Urzedowe Poswiadczenie Odbioru (UPO) content for a closed session.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'UPO XML content' })
  @RequirePermission('ksef', 'read')
  async downloadUpo(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Res() res: Response,
  ): Promise<void> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);
    const upoContent = await this.sessionService.getUpoContent(id, companyId);

    if (!upoContent) {
      throw new NotFoundException('UPO nie jest jeszcze dostepne dla tej sesji');
    }

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="upo-${id}.xml"`,
    );
    res.send(upoContent);
  }
}
