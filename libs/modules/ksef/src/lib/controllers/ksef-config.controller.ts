import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser, JwtAuthGuard } from '@accounting/auth';
import { User } from '@accounting/common';
import { SystemCompanyService } from '@accounting/common/backend';
import {
  ModuleAccessGuard,
  PermissionGuard,
  RequireModule,
  RequirePermission,
} from '@accounting/rbac';

import {
  KsefConfigResponseDto,
  KsefConnectionTestResultDto,
  UpsertKsefConfigDto,
} from '../dto';
import { KsefConfigService } from '../services/ksef-config.service';

@ApiTags('KSeF - Configuration')
@ApiBearerAuth('JWT-auth')
@Controller('modules/ksef/config')
@UseGuards(JwtAuthGuard, ModuleAccessGuard, PermissionGuard)
@RequireModule('ksef')
@RequirePermission('ksef', 'manage')
export class KsefConfigController {
  constructor(
    private readonly configService: KsefConfigService,
    private readonly systemCompanyService: SystemCompanyService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get KSeF configuration',
    description: 'Returns the KSeF configuration for the current company.',
  })
  @ApiResponse({ status: 200, type: KsefConfigResponseDto })
  async getConfig(
    @CurrentUser() user: User,
  ): Promise<KsefConfigResponseDto | null> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);
    const config = await this.configService.getConfig(companyId);
    if (!config) return null;
    return this.configService.toResponseDto(config);
  }

  @Put()
  @ApiOperation({
    summary: 'Create or update KSeF configuration',
    description: 'Creates or updates the KSeF configuration for the current company.',
  })
  @ApiResponse({ status: 200, type: KsefConfigResponseDto })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async createOrUpdate(
    @Body() dto: UpsertKsefConfigDto,
    @CurrentUser() user: User,
  ): Promise<KsefConfigResponseDto> {
    return this.configService.createOrUpdate(dto, user);
  }

  @Delete()
  @ApiOperation({
    summary: 'Delete KSeF configuration',
    description: 'Deletes the KSeF configuration for the current company.',
  })
  @ApiResponse({ status: 204 })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteConfig(@CurrentUser() user: User): Promise<void> {
    await this.configService.deleteConfig(user);
  }

  @Post('test-connection')
  @ApiOperation({
    summary: 'Test KSeF connection',
    description: 'Tests the connection to the KSeF API using the stored configuration.',
  })
  @ApiResponse({ status: 200, type: KsefConnectionTestResultDto })
  async testConnection(
    @CurrentUser() user: User,
  ): Promise<KsefConnectionTestResultDto> {
    return this.configService.testConnection(user);
  }
}
