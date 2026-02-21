import { SetMetadata } from '@nestjs/common';

export const REQUIRE_COMPANY_KEY = 'requireCompany';

/**
 * Decorator that requires the authenticated user to be associated with a company.
 * Use this on endpoints that require a companyId to operate.
 * Must be used with RequireCompanyGuard.
 *
 * @example
 * ```ts
 * @Get('company')
 * @UseGuards(JwtAuthGuard, RequireCompanyGuard)
 * @RequireCompany()
 * getCompanyData(@CurrentUser() user: User) {
 *   // user.companyId is guaranteed to exist here
 * }
 * ```
 */
export const RequireCompany = () => SetMetadata(REQUIRE_COMPANY_KEY, true);
