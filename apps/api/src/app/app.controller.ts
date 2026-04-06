import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '@accounting/auth';

@ApiTags('Health')
@Controller()
export class AppController {
  @Get()
  @Public()
  @ApiOperation({ summary: 'Root endpoint' })
  @ApiOkResponse({ description: 'Welcome message' })
  getData() {
    return { message: 'Hello API' };
  }
}
