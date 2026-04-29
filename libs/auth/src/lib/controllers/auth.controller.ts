import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, Req, Res } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { Request, Response } from 'express';

import { ErrorMessages, User, UserResponseDto } from '@accounting/common';

import { CurrentUser } from '../decorators/current-user.decorator';
import { Public } from '../decorators/public.decorator';
import { AuthResponseDto } from '../dto/auth-response.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { RegisterDto } from '../dto/register.dto';
import { AuthService } from '../services/auth.service';
import {
  COOKIE_NAMES,
  getAccessTokenCookieOptions,
  getClearCookieOptions,
  getRefreshTokenCookieOptions,
} from '../utils/cookie-options';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, type: AuthResponseDto })
  @ApiResponse({ status: 409, description: 'User already exists' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({
    status: 429,
    description: 'Too many registration attempts. Please try again later.',
  })
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) res: Response
  ): Promise<AuthResponseDto> {
    const result = await this.authService.register(registerDto);
    this.setAuthCookies(res, result.access_token, result.refresh_token);
    return result;
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 429, description: 'Too many login attempts. Please try again later.' })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response
  ): Promise<AuthResponseDto> {
    const result = await this.authService.login(loginDto);
    this.setAuthCookies(res, result.access_token, result.refresh_token);
    return result;
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  @ApiResponse({ status: 429, description: 'Too many refresh attempts. Please try again later.' })
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ): Promise<AuthResponseDto> {
    // Dual-mode: prefer cookie refresh token, fall back to body
    const refreshToken = req.cookies?.[COOKIE_NAMES.REFRESH_TOKEN] || refreshTokenDto.refresh_token;
    const result = await this.authService.refreshToken(refreshToken);
    this.setAuthCookies(res, result.access_token, result.refresh_token);
    return result;
  }

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get current user',
    description: 'Retrieve the currently authenticated user profile information',
  })
  @ApiOkResponse({ description: 'Returns current authenticated user', type: UserResponseDto })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  async getCurrentUser(@CurrentUser() user: User): Promise<UserResponseDto> {
    return user;
  }

  @Get('ws-token')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Issue a short-lived ticket for Socket.IO handshakes',
    description:
      'In split deploys (frontend on Vercel, API on Railway) the auth cookie ' +
      'is bound to the frontend host and never reaches the WS origin. Clients ' +
      'fetch this ticket over the working REST path and pass it as Socket.IO ' +
      '`auth.token`. The ticket is a 5-minute JWT verified by the same gateway ' +
      'logic as a regular access token.',
  })
  @ApiOkResponse({
    description: 'Returns a short-lived token suitable for the WS handshake',
    schema: {
      type: 'object',
      properties: { token: { type: 'string' } },
      required: ['token'],
    },
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async getWsToken(@CurrentUser() user: User): Promise<{ token: string }> {
    return { token: this.authService.issueWsToken(user) };
  }

  @Patch('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Change password',
    description: 'Change the password for the currently authenticated user',
  })
  @ApiOkResponse({ description: 'Password changed successfully' })
  @ApiBadRequestResponse({
    description: 'Current password is incorrect or new password is invalid',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  async changePassword(
    @CurrentUser() user: User,
    @Body() changePasswordDto: ChangePasswordDto
  ): Promise<{ message: string }> {
    await this.authService.changePassword(user.id, changePasswordDto);
    return { message: ErrorMessages.AUTH.PASSWORD_CHANGED };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Logout user',
    description:
      'Invalidates all existing tokens by incrementing tokenVersion and clears httpOnly auth cookies.',
  })
  @ApiOkResponse({ description: 'Logged out successfully' })
  async logout(
    @CurrentUser() user: User,
    @Res({ passthrough: true }) res: Response
  ): Promise<{ message: string }> {
    // Invalidate all existing tokens (access + refresh) for this user
    await this.authService.invalidateTokens(user.id);

    const isProduction = process.env.NODE_ENV === 'production';
    res.clearCookie(COOKIE_NAMES.ACCESS_TOKEN, getClearCookieOptions(isProduction));
    res.clearCookie(COOKIE_NAMES.REFRESH_TOKEN, getClearCookieOptions(isProduction));
    // Clear legacy cookies set with old path '/api' (pre-2026-04-13 deployments)
    res.clearCookie(COOKIE_NAMES.ACCESS_TOKEN, {
      ...getClearCookieOptions(isProduction),
      path: '/api',
    });
    res.clearCookie(COOKIE_NAMES.REFRESH_TOKEN, {
      ...getClearCookieOptions(isProduction),
      path: '/api',
    });
    return { message: ErrorMessages.SUCCESS.LOGOUT };
  }

  /**
   * Sets httpOnly cookies for access and refresh tokens.
   * Cookies are sent alongside the JSON response body for dual-mode support
   * (frontend can use either cookies or Authorization header during migration).
   */
  private setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie(COOKIE_NAMES.ACCESS_TOKEN, accessToken, getAccessTokenCookieOptions(isProduction));
    res.cookie(
      COOKIE_NAMES.REFRESH_TOKEN,
      refreshToken,
      getRefreshTokenCookieOptions(isProduction)
    );
  }
}
