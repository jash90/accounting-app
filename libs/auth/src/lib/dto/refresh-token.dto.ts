import { ApiPropertyOptional } from '@nestjs/swagger';

import { IsOptional, IsString } from 'class-validator';

/**
 * Refresh-token request body.
 *
 * The field is OPTIONAL because the controller supports two modes:
 *  1. Cookie-based (default for the web app): the refresh token comes from
 *     the `refresh_token` httpOnly cookie set at login. The body can be
 *     empty.
 *  2. Body-based (for non-cookie clients like CLI / mobile): caller
 *     explicitly POSTs `{ refresh_token: "..." }`.
 *
 * Without `@IsOptional()`, the ValidationPipe rejects empty-body
 * cookie-based refreshes with `400 - "refresh_token must be a string"`,
 * which forces a logout loop on the web app every hour.
 */
export class RefreshTokenDto {
  @ApiPropertyOptional({
    description:
      'Refresh token. Optional — when omitted, the controller falls back to the `refresh_token` cookie.',
  })
  @IsOptional()
  @IsString()
  refresh_token?: string;
}
