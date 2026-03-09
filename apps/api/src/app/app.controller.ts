import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '@accounting/auth';

import { AppService } from './app.service';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly configService: ConfigService
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Root endpoint' })
  @ApiOkResponse({ description: 'Welcome message' })
  getData() {
    return this.appService.getData();
  }

  @Get('health')
  @Public()
  @ApiOperation({ summary: 'Health check endpoint for Railway deployment' })
  @ApiOkResponse({ description: 'Health check status' })
  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: this.configService.get<string>('NODE_ENV') || 'development',
    };
  }
}
