import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  ForbiddenException,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiConflictResponse,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { EmailConfigService } from '../services/email-config.service';
import { EmailService } from '../services/email.service';
import { CreateEmailConfigDto } from '../dto/create-email-config.dto';
import { UpdateEmailConfigDto } from '../dto/update-email-config.dto';
import { SendEmailDto } from '../dto/send-email.dto';
import { CurrentUser, Roles, RolesGuard } from '@accounting/auth';
import { User, UserRole, EmailConfiguration } from '@accounting/common';
import { OwnerOrAdminGuard } from '@accounting/rbac';

@ApiTags('Email Configuration')
@ApiBearerAuth('JWT-auth')
@Controller('email-config')
export class EmailConfigController {
  constructor(
    private readonly emailConfigService: EmailConfigService,
    private readonly emailService: EmailService,
  ) {}

  // ========== USER EMAIL CONFIGURATION ENDPOINTS ==========

  @Get('user')
  @ApiOperation({
    summary: 'Get user email configuration',
    description: 'Retrieve the email configuration for the authenticated user',
  })
  @ApiOkResponse({ description: 'User email configuration', type: EmailConfiguration })
  @ApiNotFoundResponse({ description: 'Email configuration not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  getUserEmailConfig(@CurrentUser() user: User) {
    return this.emailConfigService.getUserConfig(user.id);
  }

  @Post('user')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create user email configuration',
    description: 'Create a new email configuration for the authenticated user',
  })
  @ApiBody({ type: CreateEmailConfigDto })
  @ApiCreatedResponse({ description: 'Email configuration created successfully', type: EmailConfiguration })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiConflictResponse({ description: 'User already has an email configuration' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  createUserEmailConfig(@CurrentUser() user: User, @Body() createDto: CreateEmailConfigDto) {
    return this.emailConfigService.createUserConfig(user.id, createDto);
  }

  @Put('user')
  @ApiOperation({
    summary: 'Update user email configuration',
    description: 'Update the email configuration for the authenticated user',
  })
  @ApiBody({ type: UpdateEmailConfigDto })
  @ApiOkResponse({ description: 'Email configuration updated successfully', type: EmailConfiguration })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiNotFoundResponse({ description: 'Email configuration not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  updateUserEmailConfig(@CurrentUser() user: User, @Body() updateDto: UpdateEmailConfigDto) {
    return this.emailConfigService.updateUserConfig(user.id, updateDto);
  }

  @Delete('user')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete user email configuration',
    description: 'Delete the email configuration for the authenticated user',
  })
  @ApiNoContentResponse({ description: 'Email configuration deleted successfully' })
  @ApiNotFoundResponse({ description: 'Email configuration not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  async deleteUserEmailConfig(@CurrentUser() user: User) {
    await this.emailConfigService.deleteUserConfig(user.id);
  }

  @Post('send')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Send email using user email configuration',
    description: 'Send an email using the authenticated user\'s SMTP configuration',
  })
  @ApiBody({ type: SendEmailDto })
  @ApiNoContentResponse({ description: 'Email sent successfully' })
  @ApiBadRequestResponse({ description: 'Invalid input data or email configuration error' })
  @ApiNotFoundResponse({ description: 'Email configuration not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  async sendEmail(@CurrentUser() user: User, @Body() sendDto: SendEmailDto) {
    await this.emailService.sendEmail(user.id, sendDto);
  }

  @Get('inbox')
  @ApiOperation({
    summary: 'Check user inbox',
    description: 'Retrieve recent emails from the authenticated user\'s inbox using IMAP',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of recent emails to retrieve (default: 10)',
    example: 10,
  })
  @ApiOkResponse({ description: 'Inbox emails retrieved successfully' })
  @ApiBadRequestResponse({ description: 'Email configuration error or IMAP connection failed' })
  @ApiNotFoundResponse({ description: 'Email configuration not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  async checkInbox(@CurrentUser() user: User, @Query('limit') limit?: number) {
    return this.emailService.checkInbox(user.id, limit || 10);
  }

  // ========== COMPANY EMAIL CONFIGURATION ENDPOINTS ==========

  @Get('company')
  @UseGuards(RolesGuard, OwnerOrAdminGuard)
  @Roles(UserRole.COMPANY_OWNER)
  @ApiOperation({
    summary: 'Get company email configuration',
    description: 'Retrieve the email configuration for the company (COMPANY_OWNER only)',
  })
  @ApiOkResponse({ description: 'Company email configuration', type: EmailConfiguration })
  @ApiNotFoundResponse({ description: 'Company email configuration not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - COMPANY_OWNER role required' })
  getCompanyEmailConfig(@CurrentUser() user: User) {
    if (!user.companyId) {
      throw new ForbiddenException('User is not associated with a company');
    }
    return this.emailConfigService.getCompanyConfig(user.companyId);
  }

  @Post('company')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard, OwnerOrAdminGuard)
  @Roles(UserRole.COMPANY_OWNER)
  @ApiOperation({
    summary: 'Create company email configuration',
    description: 'Create a new email configuration for the company (COMPANY_OWNER only)',
  })
  @ApiBody({ type: CreateEmailConfigDto })
  @ApiCreatedResponse({ description: 'Company email configuration created successfully', type: EmailConfiguration })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiConflictResponse({ description: 'Company already has an email configuration' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - COMPANY_OWNER role required' })
  createCompanyEmailConfig(@CurrentUser() user: User, @Body() createDto: CreateEmailConfigDto) {
    if (!user.companyId) {
      throw new ForbiddenException('User is not associated with a company');
    }
    return this.emailConfigService.createCompanyConfig(user.companyId, createDto);
  }

  @Put('company')
  @UseGuards(RolesGuard, OwnerOrAdminGuard)
  @Roles(UserRole.COMPANY_OWNER)
  @ApiOperation({
    summary: 'Update company email configuration',
    description: 'Update the email configuration for the company (COMPANY_OWNER only)',
  })
  @ApiBody({ type: UpdateEmailConfigDto })
  @ApiOkResponse({ description: 'Company email configuration updated successfully', type: EmailConfiguration })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiNotFoundResponse({ description: 'Company email configuration not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - COMPANY_OWNER role required' })
  updateCompanyEmailConfig(@CurrentUser() user: User, @Body() updateDto: UpdateEmailConfigDto) {
    if (!user.companyId) {
      throw new ForbiddenException('User is not associated with a company');
    }
    return this.emailConfigService.updateCompanyConfig(user.companyId, updateDto);
  }

  @Delete('company')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard, OwnerOrAdminGuard)
  @Roles(UserRole.COMPANY_OWNER)
  @ApiOperation({
    summary: 'Delete company email configuration',
    description: 'Delete the email configuration for the company (COMPANY_OWNER only)',
  })
  @ApiNoContentResponse({ description: 'Company email configuration deleted successfully' })
  @ApiNotFoundResponse({ description: 'Company email configuration not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - COMPANY_OWNER role required' })
  async deleteCompanyEmailConfig(@CurrentUser() user: User) {
    if (!user.companyId) {
      throw new ForbiddenException('User is not associated with a company');
    }
    await this.emailConfigService.deleteCompanyConfig(user.companyId);
  }

  @Post('company/send')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard, OwnerOrAdminGuard)
  @Roles(UserRole.COMPANY_OWNER)
  @ApiOperation({
    summary: 'Send email using company email configuration',
    description: 'Send an email using the company\'s SMTP configuration (COMPANY_OWNER only)',
  })
  @ApiBody({ type: SendEmailDto })
  @ApiNoContentResponse({ description: 'Email sent successfully' })
  @ApiBadRequestResponse({ description: 'Invalid input data or email configuration error' })
  @ApiNotFoundResponse({ description: 'Email configuration not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - COMPANY_OWNER role required' })
  async sendCompanyEmail(@CurrentUser() user: User, @Body() sendDto: SendEmailDto) {
    if (!user.companyId) {
      throw new ForbiddenException('User is not associated with a company');
    }
    await this.emailService.sendCompanyEmail(user.companyId, sendDto);
  }

  @Get('company/inbox')
  @UseGuards(RolesGuard, OwnerOrAdminGuard)
  @Roles(UserRole.COMPANY_OWNER)
  @ApiOperation({
    summary: 'Check company inbox',
    description: 'Retrieve recent emails from the company\'s inbox using IMAP (COMPANY_OWNER only)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of recent emails to retrieve (default: 10)',
    example: 10,
  })
  @ApiOkResponse({ description: 'Company inbox emails retrieved successfully' })
  @ApiBadRequestResponse({ description: 'Email configuration error or IMAP connection failed' })
  @ApiNotFoundResponse({ description: 'Email configuration not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - COMPANY_OWNER role required' })
  async checkCompanyInbox(@CurrentUser() user: User, @Query('limit') limit?: number) {
    if (!user.companyId) {
      throw new ForbiddenException('User is not associated with a company');
    }
    return this.emailService.checkCompanyInbox(user.companyId, limit || 10);
  }
}
