import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { memoryStorage } from 'multer';

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
  KsefConfigPolicyDto,
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
    private readonly systemCompanyService: SystemCompanyService
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get KSeF configuration',
    description: 'Returns the KSeF configuration for the current company.',
  })
  @ApiResponse({ status: 200, type: KsefConfigResponseDto })
  async getConfig(@CurrentUser() user: User): Promise<KsefConfigResponseDto | null> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);
    const config = await this.configService.getConfig(companyId);
    if (!config) return null;
    return this.configService.toResponseDto(config);
  }

  @Get('policy')
  @ApiOperation({
    summary: 'Get KSeF policy (env-driven)',
    description:
      'Returns the operator-set KSeF policy: whether the environment can be ' +
      'changed (`KSEF_ALLOW_ENV_CHANGE`) and which environment is pinned ' +
      '(`KSEF_ENVIRONMENT`). Independent of any persisted config so the ' +
      'settings UI can render correctly even before a config row exists.',
  })
  @ApiResponse({ status: 200, type: KsefConfigPolicyDto })
  getPolicy(): KsefConfigPolicyDto {
    return this.configService.getPolicy();
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
    @CurrentUser() user: User
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
  async testConnection(@CurrentUser() user: User): Promise<KsefConnectionTestResultDto> {
    return this.configService.testConnection(user);
  }

  @Post('upload-credentials')
  @ApiOperation({
    summary: 'Upload certificate and private key files',
    description:
      'Uploads PEM certificate and/or private key files. Content is read, encrypted, and saved to the database. Files are not stored on disk.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, type: KsefConfigResponseDto })
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'certificate', maxCount: 1 },
        { name: 'privateKey', maxCount: 1 },
      ],
      {
        storage: memoryStorage(),
        limits: { fileSize: 1024 * 1024 }, // 1 MB
      }
    )
  )
  async uploadCredentials(
    @UploadedFiles()
    files: {
      certificate?: Express.Multer.File[];
      privateKey?: Express.Multer.File[];
    },
    @Body() body: { certificatePassword?: string },
    @CurrentUser() user: User
  ): Promise<KsefConfigResponseDto> {
    const certFile = files?.certificate?.[0];
    const keyFile = files?.privateKey?.[0];

    if (!certFile && !keyFile) {
      throw new BadRequestException(
        'Wymagany jest co najmniej jeden plik: certyfikat lub klucz prywatny'
      );
    }

    const certPem = certFile ? certFile.buffer.toString('utf-8').trim() : undefined;
    const keyPem = keyFile ? keyFile.buffer.toString('utf-8').trim() : undefined;

    return this.configService.uploadCredentialFiles(
      user,
      certPem,
      keyPem,
      body.certificatePassword
    );
  }
}
