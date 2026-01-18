import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateNotificationSettingsDto {
  @ApiPropertyOptional({ description: 'Receive notifications on client create' })
  @IsOptional()
  @IsBoolean()
  receiveOnCreate?: boolean;

  @ApiPropertyOptional({ description: 'Receive notifications on client update' })
  @IsOptional()
  @IsBoolean()
  receiveOnUpdate?: boolean;

  @ApiPropertyOptional({ description: 'Receive notifications on client delete' })
  @IsOptional()
  @IsBoolean()
  receiveOnDelete?: boolean;

  @ApiPropertyOptional({ description: 'Receive admin copy notifications' })
  @IsOptional()
  @IsBoolean()
  isAdminCopy?: boolean;
}
