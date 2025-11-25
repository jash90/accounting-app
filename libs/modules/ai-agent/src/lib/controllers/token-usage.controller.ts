import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
  ApiOkResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '@accounting/auth';
import {
  ModuleAccessGuard,
  PermissionGuard,
  RequireModule,
  RequirePermission,
} from '@accounting/rbac';
import { User } from '@accounting/common';
import { TokenUsageService } from '../services/token-usage.service';
import { TokenLimitService } from '../services/token-limit.service';
import { SetTokenLimitDto } from '../dto/set-token-limit.dto';
import { TokenUsageStatsDto } from '../dto/token-usage-response.dto';
import { TokenLimitResponseDto } from '../dto/token-limit-response.dto';

@ApiTags('ai-agent')
@ApiBearerAuth('JWT-auth')
@Controller('modules/ai-agent')
@UseGuards(ModuleAccessGuard, PermissionGuard)
@RequireModule('ai-agent')
export class TokenUsageController {
  constructor(
    private readonly usageService: TokenUsageService,
    private readonly limitService: TokenLimitService,
  ) {}

  @Get('usage/me')
  @RequirePermission('ai-agent', 'read')
  @ApiOperation({
    summary: 'Get my token usage',
    description: 'Retrieve token usage statistics for the authenticated user. All roles can view their own usage.',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Number of days to include in statistics (default: 30)',
    example: 30,
  })
  @ApiOkResponse({
    description: 'Usage statistics retrieved successfully',
    type: TokenUsageStatsDto,
  })
  @ApiForbiddenResponse({
    description: 'No read permission',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing JWT token',
  })
  async getMyUsage(
    @CurrentUser() user: User,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.usageService.getMyUsage(user, days);
  }

  @Get('usage/company')
  @RequirePermission('ai-agent', 'read')
  @ApiOperation({
    summary: 'Get company token usage',
    description: 'Retrieve token usage statistics for the entire company. **COMPANY_OWNER and ADMIN only**. Shows all users in the company.',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Number of days to include in statistics (default: 30)',
    example: 30,
  })
  @ApiOkResponse({
    description: 'Company usage statistics retrieved successfully',
    type: TokenUsageStatsDto,
  })
  @ApiForbiddenResponse({
    description: 'Only COMPANY_OWNER and ADMIN can view company usage',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing JWT token',
  })
  async getCompanyUsage(
    @CurrentUser() user: User,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.usageService.getCompanyUsage(user, days);
  }

  @Get('usage/all-companies')
  @RequirePermission('ai-agent', 'read')
  @ApiOperation({
    summary: 'Get token usage for all companies',
    description: 'Retrieve aggregated token usage statistics for all companies in the system. **ADMIN only**. Shows company-level breakdown with per-user details.',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Number of days to include in statistics (default: 30)',
    example: 30,
  })
  @ApiOkResponse({
    description: 'All companies usage statistics retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          companyId: { type: 'string', format: 'uuid' },
          companyName: { type: 'string' },
          totalTokens: { type: 'number' },
          totalInputTokens: { type: 'number' },
          totalOutputTokens: { type: 'number' },
          userCount: { type: 'number' },
          conversationCount: { type: 'number' },
          messageCount: { type: 'number' },
          users: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                userId: { type: 'string', format: 'uuid' },
                email: { type: 'string' },
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                totalTokens: { type: 'number' },
                totalInputTokens: { type: 'number' },
                totalOutputTokens: { type: 'number' },
                conversationCount: { type: 'number' },
                messageCount: { type: 'number' },
              },
            },
          },
        },
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Only ADMIN can view all companies usage',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing JWT token',
  })
  async getAllCompaniesUsage(
    @CurrentUser() user: User,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.usageService.getAllCompaniesUsage(user, days);
  }

  @Get('limits/me')
  @RequirePermission('ai-agent', 'read')
  @ApiOperation({
    summary: 'Get my token limits',
    description: 'Retrieve token limits and current usage for the authenticated user. Shows both user-specific and company-wide limits if applicable.',
  })
  @ApiOkResponse({
    description: 'Limits and usage retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        userLimit: {
          type: 'object',
          description: 'User-specific limit (null if not set)',
          nullable: true,
        },
        companyLimit: {
          type: 'object',
          description: 'Company-wide limit (null if not set)',
          nullable: true,
        },
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'No read permission',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing JWT token',
  })
  async getMyLimits(@CurrentUser() user: User) {
    return this.limitService.getMyLimit(user);
  }

  @Post('limits/company/:companyId')
  @RequirePermission('ai-agent', 'write')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Set company token limit',
    description: 'Set or update monthly token limit for a company. **ADMIN only**. This is a company-wide limit that affects all users.',
  })
  @ApiParam({
    name: 'companyId',
    description: 'Company ID (UUID)',
    type: 'string',
    format: 'uuid',
  })
  @ApiBody({
    type: SetTokenLimitDto,
    description: 'Limit configuration',
  })
  @ApiCreatedResponse({
    description: 'Company limit set successfully',
    type: TokenLimitResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Only ADMIN can set company limits',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing JWT token',
  })
  async setCompanyLimit(
    @Param('companyId') companyId: string,
    @Body() setDto: SetTokenLimitDto,
    @CurrentUser() user: User,
  ) {
    const limit = await this.limitService.setCompanyLimit(companyId, setDto, user);

    // Get current usage
    const companyUsage = await this.usageService.getCompanyMonthlyTotal(companyId);
    const usagePercentage = (companyUsage / limit.monthlyLimit) * 100;

    return {
      ...limit,
      currentUsage: companyUsage,
      usagePercentage,
      isExceeded: companyUsage >= limit.monthlyLimit,
      isWarning: companyUsage >= (limit.monthlyLimit * limit.warningThresholdPercentage) / 100,
    };
  }

  @Post('limits/user/:userId')
  @RequirePermission('ai-agent', 'write')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Set user token limit',
    description: 'Set or update monthly token limit for a specific user. **COMPANY_OWNER only**. User must belong to the owner\'s company.',
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID (UUID)',
    type: 'string',
    format: 'uuid',
  })
  @ApiBody({
    type: SetTokenLimitDto,
    description: 'Limit configuration',
  })
  @ApiCreatedResponse({
    description: 'User limit set successfully',
    type: TokenLimitResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Only COMPANY_OWNER can set user limits',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing JWT token',
  })
  async setUserLimit(
    @Param('userId') userId: string,
    @Body() setDto: SetTokenLimitDto,
    @CurrentUser() user: User,
  ) {
    const limit = await this.limitService.setUserLimit(userId, setDto, user);

    // Get current usage for this user
    const userEntity = await this.limitService.findUserById(userId);

    if (userEntity) {
      const userUsage = await this.usageService.getUserMonthlyTotal(userEntity);
      const usagePercentage = (userUsage / limit.monthlyLimit) * 100;

      return {
        ...limit,
        currentUsage: userUsage,
        usagePercentage,
        isExceeded: userUsage >= limit.monthlyLimit,
        isWarning: userUsage >= (limit.monthlyLimit * limit.warningThresholdPercentage) / 100,
      };
    }

    return limit;
  }
}
