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
import { Throttle } from '@nestjs/throttler';

import { CurrentUser, Roles, RolesGuard } from '@accounting/auth';
import { User, UserRole, EmailConfiguration } from '@accounting/common';
import { CreateEmailConfigDto, UpdateEmailConfigDto } from '@accounting/email';
import { OwnerOrAdminGuard, RequireCompany, RequireCompanyGuard } from '@accounting/rbac';

import { SendEmailDto } from '../dto/send-email.dto';
import { TestSmtpDto, TestImapDto, TestConnectionResultDto } from '../dto/test-connection.dto';
import { EmailConfigService } from '../services/email-config.service';
import { SmtpImapService } from '../services/smtp-imap.service';

@ApiTags('Email Configuration')
@ApiBearerAuth('JWT-auth')
@Controller('email-config')
export class EmailConfigController {
  constructor(
    private readonly emailConfigService: EmailConfigService,
    private readonly smtpImapService: SmtpImapService
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
  @ApiCreatedResponse({
    description: 'Email configuration created successfully',
    type: EmailConfiguration,
  })
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
  @ApiOkResponse({
    description: 'Email configuration updated successfully',
    type: EmailConfiguration,
  })
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
    description: "Send an email using the authenticated user's SMTP configuration",
  })
  @ApiBody({ type: SendEmailDto })
  @ApiNoContentResponse({ description: 'Email sent successfully' })
  @ApiBadRequestResponse({ description: 'Invalid input data or email configuration error' })
  @ApiNotFoundResponse({ description: 'Email configuration not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  async sendEmail(@CurrentUser() user: User, @Body() sendDto: SendEmailDto) {
    await this.smtpImapService.sendEmail(user.id, sendDto);
  }

  @Get('inbox')
  @ApiOperation({
    summary: 'Check user inbox',
    description: "Retrieve recent emails from the authenticated user's inbox using IMAP",
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
    return this.smtpImapService.checkInbox(user.id, limit || 10);
  }

  // ========== CONNECTION TEST ENDPOINTS ==========

  @Post('test/smtp')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(UserRole.COMPANY_OWNER, UserRole.ADMIN)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  @ApiOperation({
    summary: 'Test SMTP connection',
    description:
      'Test SMTP connection without sending an email. Validates credentials and server connectivity.',
  })
  @ApiBody({ type: TestSmtpDto })
  @ApiOkResponse({ description: 'SMTP connection test result', type: TestConnectionResultDto })
  @ApiBadRequestResponse({ description: 'SMTP connection failed' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - COMPANY_OWNER or ADMIN role required' })
  async testSmtp(@Body() testDto: TestSmtpDto) {
    return this.smtpImapService.testSmtpConnection(testDto);
  }

  @Post('test/imap')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(UserRole.COMPANY_OWNER, UserRole.ADMIN)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  @ApiOperation({
    summary: 'Test IMAP connection',
    description:
      'Test IMAP connection without fetching emails. Validates credentials and server connectivity.',
  })
  @ApiBody({ type: TestImapDto })
  @ApiOkResponse({ description: 'IMAP connection test result', type: TestConnectionResultDto })
  @ApiBadRequestResponse({ description: 'IMAP connection failed' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - COMPANY_OWNER or ADMIN role required' })
  async testImap(@Body() testDto: TestImapDto) {
    return this.smtpImapService.testImapConnection(testDto);
  }

  // ========== COMPANY EMAIL CONFIGURATION ENDPOINTS ==========

  @Get('company')
  @UseGuards(RolesGuard, OwnerOrAdminGuard, RequireCompanyGuard)
  @Roles(UserRole.COMPANY_OWNER)
  @RequireCompany()
  @ApiOperation({
    summary: 'Get company email configuration',
    description: 'Retrieve the email configuration for the company (COMPANY_OWNER only)',
  })
  @ApiOkResponse({ description: 'Company email configuration', type: EmailConfiguration })
  @ApiNotFoundResponse({ description: 'Company email configuration not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - COMPANY_OWNER role required' })
  getCompanyEmailConfig(@CurrentUser() user: User) {
    // companyId is guaranteed to exist by RequireCompanyGuard
    return this.emailConfigService.getCompanyConfig(user.companyId!);
  }

  @Post('company')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard, OwnerOrAdminGuard, RequireCompanyGuard)
  @Roles(UserRole.COMPANY_OWNER)
  @RequireCompany()
  @ApiOperation({
    summary: 'Create company email configuration',
    description: 'Create a new email configuration for the company (COMPANY_OWNER only)',
  })
  @ApiBody({ type: CreateEmailConfigDto })
  @ApiCreatedResponse({
    description: 'Company email configuration created successfully',
    type: EmailConfiguration,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiConflictResponse({ description: 'Company already has an email configuration' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - COMPANY_OWNER role required' })
  createCompanyEmailConfig(@CurrentUser() user: User, @Body() createDto: CreateEmailConfigDto) {
    // companyId is guaranteed to exist by RequireCompanyGuard
    return this.emailConfigService.createCompanyConfig(user.companyId!, createDto);
  }

  @Put('company')
  @UseGuards(RolesGuard, OwnerOrAdminGuard, RequireCompanyGuard)
  @Roles(UserRole.COMPANY_OWNER)
  @RequireCompany()
  @ApiOperation({
    summary: 'Update company email configuration',
    description: 'Update the email configuration for the company (COMPANY_OWNER only)',
  })
  @ApiBody({ type: UpdateEmailConfigDto })
  @ApiOkResponse({
    description: 'Company email configuration updated successfully',
    type: EmailConfiguration,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiNotFoundResponse({ description: 'Company email configuration not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - COMPANY_OWNER role required' })
  updateCompanyEmailConfig(@CurrentUser() user: User, @Body() updateDto: UpdateEmailConfigDto) {
    // companyId is guaranteed to exist by RequireCompanyGuard
    return this.emailConfigService.updateCompanyConfig(user.companyId!, updateDto);
  }

  @Delete('company')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard, OwnerOrAdminGuard, RequireCompanyGuard)
  @Roles(UserRole.COMPANY_OWNER)
  @RequireCompany()
  @ApiOperation({
    summary: 'Delete company email configuration',
    description: 'Delete the email configuration for the company (COMPANY_OWNER only)',
  })
  @ApiNoContentResponse({ description: 'Company email configuration deleted successfully' })
  @ApiNotFoundResponse({ description: 'Company email configuration not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - COMPANY_OWNER role required' })
  async deleteCompanyEmailConfig(@CurrentUser() user: User) {
    // companyId is guaranteed to exist by RequireCompanyGuard
    await this.emailConfigService.deleteCompanyConfig(user.companyId!);
  }

  @Post('company/send')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard, OwnerOrAdminGuard, RequireCompanyGuard)
  @Roles(UserRole.COMPANY_OWNER)
  @RequireCompany()
  @ApiOperation({
    summary: 'Send email using company email configuration',
    description: "Send an email using the company's SMTP configuration (COMPANY_OWNER only)",
  })
  @ApiBody({ type: SendEmailDto })
  @ApiNoContentResponse({ description: 'Email sent successfully' })
  @ApiBadRequestResponse({ description: 'Invalid input data or email configuration error' })
  @ApiNotFoundResponse({ description: 'Email configuration not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - COMPANY_OWNER role required' })
  async sendCompanyEmail(@CurrentUser() user: User, @Body() sendDto: SendEmailDto) {
    // companyId is guaranteed to exist by RequireCompanyGuard
    await this.smtpImapService.sendCompanyEmail(user.companyId!, sendDto);
  }

  @Get('company/inbox')
  @UseGuards(RolesGuard, OwnerOrAdminGuard, RequireCompanyGuard)
  @Roles(UserRole.COMPANY_OWNER)
  @RequireCompany()
  @ApiOperation({
    summary: 'Check company inbox',
    description: "Retrieve recent emails from the company's inbox using IMAP (COMPANY_OWNER only)",
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
    // companyId is guaranteed to exist by RequireCompanyGuard
    return this.smtpImapService.checkCompanyInbox(user.companyId!, limit || 10);
  }

  // ========== COMPANY CONNECTION TEST ENDPOINTS ==========

  @Post('test/company/smtp')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard, OwnerOrAdminGuard, RequireCompanyGuard)
  @Roles(UserRole.COMPANY_OWNER)
  @RequireCompany()
  @ApiOperation({
    summary: 'Test company SMTP connection',
    description: 'Test SMTP connection for company without sending an email (COMPANY_OWNER only)',
  })
  @ApiBody({ type: TestSmtpDto })
  @ApiOkResponse({ description: 'SMTP connection test result', type: TestConnectionResultDto })
  @ApiBadRequestResponse({ description: 'SMTP connection failed' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - COMPANY_OWNER role required' })
  async testCompanySmtp(@CurrentUser() user: User, @Body() testDto: TestSmtpDto) {
    return this.smtpImapService.testSmtpConnection(testDto);
  }

  @Post('test/company/imap')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard, OwnerOrAdminGuard, RequireCompanyGuard)
  @Roles(UserRole.COMPANY_OWNER)
  @RequireCompany()
  @ApiOperation({
    summary: 'Test company IMAP connection',
    description: 'Test IMAP connection for company without fetching emails (COMPANY_OWNER only)',
  })
  @ApiBody({ type: TestImapDto })
  @ApiOkResponse({ description: 'IMAP connection test result', type: TestConnectionResultDto })
  @ApiBadRequestResponse({ description: 'IMAP connection failed' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - COMPANY_OWNER role required' })
  async testCompanyImap(@CurrentUser() user: User, @Body() testDto: TestImapDto) {
    return this.smtpImapService.testImapConnection(testDto);
  }

  // ========== SYSTEM ADMIN EMAIL CONFIGURATION ENDPOINTS (ADMIN ONLY) ==========

  @Get('system-admin')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get System Admin email configuration',
    description: 'Retrieve the shared email configuration for all admins (ADMIN only)',
  })
  @ApiOkResponse({ description: 'System Admin email configuration', type: EmailConfiguration })
  @ApiNotFoundResponse({ description: 'System Admin email configuration not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - ADMIN role required' })
  getSystemAdminEmailConfig(@CurrentUser() _user: User) {
    return this.emailConfigService.getSystemAdminConfig();
  }

  @Post('system-admin')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Create System Admin email configuration',
    description: 'Create a new shared email configuration for all admins (ADMIN only)',
  })
  @ApiBody({ type: CreateEmailConfigDto })
  @ApiCreatedResponse({
    description: 'System Admin email configuration created successfully',
    type: EmailConfiguration,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiConflictResponse({ description: 'System Admin already has an email configuration' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - ADMIN role required' })
  createSystemAdminEmailConfig(@CurrentUser() user: User, @Body() createDto: CreateEmailConfigDto) {
    return this.emailConfigService.createSystemAdminConfig(createDto);
  }

  @Put('system-admin')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Update System Admin email configuration',
    description: 'Update the shared email configuration for all admins (ADMIN only)',
  })
  @ApiBody({ type: UpdateEmailConfigDto })
  @ApiOkResponse({
    description: 'System Admin email configuration updated successfully',
    type: EmailConfiguration,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiNotFoundResponse({ description: 'System Admin email configuration not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - ADMIN role required' })
  updateSystemAdminEmailConfig(@CurrentUser() user: User, @Body() updateDto: UpdateEmailConfigDto) {
    return this.emailConfigService.updateSystemAdminConfig(updateDto);
  }

  @Delete('system-admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Delete System Admin email configuration',
    description: 'Delete the shared email configuration for all admins (ADMIN only)',
  })
  @ApiNoContentResponse({ description: 'System Admin email configuration deleted successfully' })
  @ApiNotFoundResponse({ description: 'System Admin email configuration not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - ADMIN role required' })
  async deleteSystemAdminEmailConfig(@CurrentUser() _user: User) {
    await this.emailConfigService.deleteSystemAdminConfig();
  }

  @Post('system-admin/send')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Send email using System Admin email configuration',
    description: 'Send an email using the shared System Admin SMTP configuration (ADMIN only)',
  })
  @ApiBody({ type: SendEmailDto })
  @ApiNoContentResponse({ description: 'Email sent successfully' })
  @ApiBadRequestResponse({ description: 'Invalid input data or email configuration error' })
  @ApiNotFoundResponse({ description: 'Email configuration not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - ADMIN role required' })
  async sendSystemAdminEmail(@CurrentUser() user: User, @Body() sendDto: SendEmailDto) {
    const systemAdminCompanyId = await this.emailConfigService.getSystemAdminCompanyId();
    await this.smtpImapService.sendCompanyEmail(systemAdminCompanyId, sendDto);
  }

  @Get('system-admin/inbox')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Check System Admin inbox',
    description: 'Retrieve recent emails from the System Admin inbox using IMAP (ADMIN only)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of recent emails to retrieve (default: 10)',
    example: 10,
  })
  @ApiOkResponse({ description: 'System Admin inbox emails retrieved successfully' })
  @ApiBadRequestResponse({ description: 'Email configuration error or IMAP connection failed' })
  @ApiNotFoundResponse({ description: 'Email configuration not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - ADMIN role required' })
  async checkSystemAdminInbox(@CurrentUser() user: User, @Query('limit') limit?: number) {
    const systemAdminCompanyId = await this.emailConfigService.getSystemAdminCompanyId();
    return this.smtpImapService.checkCompanyInbox(systemAdminCompanyId, limit || 10);
  }

  // ========== SYSTEM ADMIN CONNECTION TEST ENDPOINTS ==========

  @Post('test/system-admin/smtp')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Test System Admin SMTP connection',
    description: 'Test SMTP connection for System Admin without sending an email (ADMIN only)',
  })
  @ApiBody({ type: TestSmtpDto })
  @ApiOkResponse({ description: 'SMTP connection test result', type: TestConnectionResultDto })
  @ApiBadRequestResponse({ description: 'SMTP connection failed' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - ADMIN role required' })
  async testSystemAdminSmtp(@CurrentUser() user: User, @Body() testDto: TestSmtpDto) {
    return this.smtpImapService.testSmtpConnection(testDto);
  }

  @Post('test/system-admin/imap')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Test System Admin IMAP connection',
    description: 'Test IMAP connection for System Admin without fetching emails (ADMIN only)',
  })
  @ApiBody({ type: TestImapDto })
  @ApiOkResponse({ description: 'IMAP connection test result', type: TestConnectionResultDto })
  @ApiBadRequestResponse({ description: 'IMAP connection failed' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - ADMIN role required' })
  async testSystemAdminImap(@CurrentUser() user: User, @Body() testDto: TestImapDto) {
    return this.smtpImapService.testImapConnection(testDto);
  }
}
