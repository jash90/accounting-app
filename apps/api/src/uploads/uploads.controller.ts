
import { Controller, Get, Logger, NotFoundException, Param, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

import { Response } from 'express';
import { existsSync } from 'fs';
import { join } from 'path';

import { CurrentUser, JwtAuthGuard } from '@accounting/auth';
import { User } from '@accounting/common';

/**
 * Serves uploaded files with JWT authentication.
 * Replaces the unprotected ServeStaticModule configuration.
 *
 * Security:
 * - Requires valid JWT token
 * - Sanitizes filenames (path.basename) to prevent path traversal
 * - Only serves files from the uploads directory
 */
@ApiTags('Uploads')
@ApiBearerAuth('JWT-auth')
@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  private readonly logger = new Logger(UploadsController.name);
  private readonly uploadsPath = join(process.cwd(), 'uploads');

  @Get(':filename')
  @ApiOperation({
    summary: 'Get an uploaded file',
    description: 'Serves an uploaded file. Requires authentication.',
  })
  @ApiParam({
    name: 'filename',
    type: 'string',
    description: 'Name of the uploaded file',
  })
  @ApiResponse({ status: 200, description: 'File content' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'File not found' })
  serveFile(
    @Param('filename') filename: string,
    @CurrentUser() user: User,
    @Res() res: Response
  ): void {
    // Sanitize: extract only the basename to prevent path traversal (e.g., ../../etc/passwd)
    const sanitizedName = require('path').basename(filename);
    const filePath = join(this.uploadsPath, sanitizedName);

    if (!existsSync(filePath)) {
      this.logger.warn(`File not found: ${sanitizedName} (requested by user ${user.id})`);
      throw new NotFoundException('Plik nie został znaleziony');
    }

    this.logger.debug(`Serving file: ${sanitizedName} to user ${user.id}`);
    res.sendFile(filePath);
  }

  @Get(':subdir/:filename')
  @ApiOperation({
    summary: 'Get an uploaded file from a subdirectory',
    description: 'Serves an uploaded file from a subdirectory. Requires authentication.',
  })
  @ApiParam({ name: 'subdir', type: 'string', description: 'Subdirectory name' })
  @ApiParam({ name: 'filename', type: 'string', description: 'File name' })
  @ApiResponse({ status: 200, description: 'File content' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'File not found' })
  serveSubdirFile(
    @Param('subdir') subdir: string,
    @Param('filename') filename: string,
    @CurrentUser() user: User,
    @Res() res: Response
  ): void {
    // Sanitize both parts to prevent path traversal
    const sanitizedSubdir = require('path').basename(subdir);
    const sanitizedName = require('path').basename(filename);
    const filePath = join(this.uploadsPath, sanitizedSubdir, sanitizedName);

    if (!existsSync(filePath)) {
      this.logger.warn(
        `File not found: ${sanitizedSubdir}/${sanitizedName} (requested by user ${user.id})`
      );
      throw new NotFoundException('Plik nie został znaleziony');
    }

    this.logger.debug(`Serving file: ${sanitizedSubdir}/${sanitizedName} to user ${user.id}`);
    res.sendFile(filePath);
  }
}
