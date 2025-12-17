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
} from '@nestjs/swagger';
import { EmailConfigService } from '../services/email-config.service';
import { CreateEmailConfigDto } from '../dto/create-email-config.dto';
import { UpdateEmailConfigDto } from '../dto/update-email-config.dto';
import { CurrentUser, Roles, RolesGuard } from '@accounting/auth';
import { User, UserRole, EmailConfiguration } from '@accounting/common';
import { OwnerOrAdminGuard } from '@accounting/rbac';

@ApiTags('Email Configuration')
@ApiBearerAuth('JWT-auth')
@Controller('email-config')
export class EmailConfigController {
  constructor(private readonly emailConfigService: EmailConfigService) {}

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
}
