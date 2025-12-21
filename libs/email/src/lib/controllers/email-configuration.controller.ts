import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard, CurrentUser } from '@accounting/auth';
import { OwnerOrAdminGuard } from '@accounting/rbac';
import { User } from '@accounting/common';
import { EmailConfigurationService } from '../services/email-configuration.service';
import { EmailAutodiscoveryService } from '../services/email-autodiscovery.service';
import { CreateEmailConfigDto } from '../dto/create-email-config.dto';
import { UpdateEmailConfigDto } from '../dto/update-email-config.dto';
import { EmailConfigResponseDto } from '../dto/email-config-response.dto';
import {
  AutodiscoverRequestDto,
  AutodiscoverResponseDto,
} from '../dto/autodiscover.dto';

/**
 * Controller for managing email configurations
 * Provides separate endpoints for user and company configurations
 */
@ApiTags('Email Configuration')
@ApiBearerAuth('JWT-auth')
@Controller('email-config')
@UseGuards(JwtAuthGuard)
export class EmailConfigurationController {
  constructor(
    private readonly emailConfigService: EmailConfigurationService,
    private readonly autodiscoveryService: EmailAutodiscoveryService,
  ) {}

  // ==================== USER ENDPOINTS ====================

  /**
   * Create email configuration for current user
   * Only the user themselves can create their own configuration
   */
  @Post('user')
  async createUserConfig(
    @CurrentUser() user: User,
    @Body() dto: CreateEmailConfigDto,
  ): Promise<EmailConfigResponseDto> {
    return this.emailConfigService.createUserConfig(user.id, dto);
  }

  /**
   * Get email configuration for current user
   */
  @Get('user')
  async getUserConfig(
    @CurrentUser() user: User,
  ): Promise<EmailConfigResponseDto> {
    return this.emailConfigService.getUserConfig(user.id);
  }

  /**
   * Update email configuration for current user
   */
  @Put('user')
  async updateUserConfig(
    @CurrentUser() user: User,
    @Body() dto: UpdateEmailConfigDto,
  ): Promise<EmailConfigResponseDto> {
    return this.emailConfigService.updateUserConfig(user.id, dto);
  }

  /**
   * Delete email configuration for current user
   */
  @Delete('user')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUserConfig(@CurrentUser() user: User): Promise<void> {
    return this.emailConfigService.deleteUserConfig(user.id);
  }

  // ==================== COMPANY ENDPOINTS ====================

  /**
   * Create email configuration for user's company
   * Only COMPANY_OWNER or ADMIN can create company configuration
   */
  @Post('company')
  @UseGuards(OwnerOrAdminGuard)
  async createCompanyConfig(
    @CurrentUser() user: User,
    @Body() dto: CreateEmailConfigDto,
  ): Promise<EmailConfigResponseDto> {
    if (!user.companyId) {
      throw new Error('User is not associated with a company');
    }
    return this.emailConfigService.createCompanyConfig(user.companyId, dto);
  }

  /**
   * Get email configuration for user's company
   * Accessible to all employees of the company
   */
  @Get('company')
  async getCompanyConfig(
    @CurrentUser() user: User,
  ): Promise<EmailConfigResponseDto> {
    if (!user.companyId) {
      throw new Error('User is not associated with a company');
    }
    return this.emailConfigService.getCompanyConfig(user.companyId);
  }

  /**
   * Update email configuration for user's company
   * Only COMPANY_OWNER or ADMIN can update company configuration
   */
  @Put('company')
  @UseGuards(OwnerOrAdminGuard)
  async updateCompanyConfig(
    @CurrentUser() user: User,
    @Body() dto: UpdateEmailConfigDto,
  ): Promise<EmailConfigResponseDto> {
    if (!user.companyId) {
      throw new Error('User is not associated with a company');
    }
    return this.emailConfigService.updateCompanyConfig(user.companyId, dto);
  }

  /**
   * Delete email configuration for user's company
   * Only COMPANY_OWNER or ADMIN can delete company configuration
   */
  @Delete('company')
  @UseGuards(OwnerOrAdminGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCompanyConfig(@CurrentUser() user: User): Promise<void> {
    if (!user.companyId) {
      throw new Error('User is not associated with a company');
    }
    return this.emailConfigService.deleteCompanyConfig(user.companyId);
  }

  // ==================== AUTODISCOVERY ENDPOINTS ====================

  /**
   * Auto-discover email server configuration
   * Attempts to find SMTP/IMAP settings for the given email address
   * Uses multiple discovery methods: known providers, Autoconfig, Autodiscover, DNS SRV, MX heuristics
   */
  @Post('autodiscover')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Auto-discover email server configuration',
    description:
      'Attempts to automatically discover SMTP and IMAP server settings for the given email address. ' +
      'Uses multiple discovery methods in sequence: known provider database, Mozilla Autoconfig, ' +
      'Microsoft Autodiscover, DNS SRV records, and MX record heuristics.',
  })
  @ApiResponse({
    status: 200,
    description: 'Discovery completed (check success field for result)',
    type: AutodiscoverResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid email address format' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  async autodiscover(
    @Body() dto: AutodiscoverRequestDto,
  ): Promise<AutodiscoverResponseDto> {
    const result = await this.autodiscoveryService.discover(dto.email);
    return AutodiscoverResponseDto.fromResult(result);
  }
}
