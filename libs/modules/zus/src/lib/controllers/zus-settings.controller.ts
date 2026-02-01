import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser, JwtAuthGuard } from '@accounting/auth';
import { User, ZusRateType } from '@accounting/common';
import {
  ModuleAccessGuard,
  PermissionGuard,
  RequireModule,
  RequirePermission,
} from '@accounting/rbac';

import { UpdateZusSettingsDto, ZusRatesResponseDto, ZusSettingsResponseDto } from '../dto';
import { ZusRatesService, ZusSettingsService } from '../services';

@ApiTags('ZUS Settings')
@ApiBearerAuth()
@Controller('modules/zus/settings')
@UseGuards(JwtAuthGuard, ModuleAccessGuard, PermissionGuard)
@RequireModule('zus')
export class ZusSettingsController {
  constructor(
    private readonly settingsService: ZusSettingsService,
    private readonly ratesService: ZusRatesService
  ) {}

  @Get('client/:clientId')
  @RequirePermission('zus', 'read')
  @ApiOperation({ summary: 'Get ZUS settings for a client' })
  @ApiResponse({ status: 200, type: ZusSettingsResponseDto })
  async getClientSettings(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @CurrentUser() user: User
  ): Promise<ZusSettingsResponseDto | null> {
    return this.settingsService.getClientSettings(clientId, user);
  }

  @Put('client/:clientId')
  @RequirePermission('zus', 'write')
  @ApiOperation({ summary: 'Create or update ZUS settings for a client' })
  @ApiResponse({ status: 200, type: ZusSettingsResponseDto })
  async updateClientSettings(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Body() dto: UpdateZusSettingsDto,
    @CurrentUser() user: User
  ): Promise<ZusSettingsResponseDto> {
    return this.settingsService.createOrUpdateSettings(clientId, dto, user);
  }

  @Delete('client/:clientId')
  @RequirePermission('zus', 'delete')
  @ApiOperation({ summary: 'Delete ZUS settings for a client' })
  @ApiResponse({ status: 200 })
  async deleteClientSettings(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @CurrentUser() user: User
  ): Promise<{ message: string }> {
    await this.settingsService.deleteSettings(clientId, user);
    return { message: 'Ustawienia ZUS zostały usunięte' };
  }

  @Get('rates')
  @RequirePermission('zus', 'read')
  @ApiOperation({ summary: 'Get current ZUS rates and bases' })
  @ApiResponse({ status: 200, type: ZusRatesResponseDto })
  async getCurrentRates(): Promise<ZusRatesResponseDto> {
    const rates = await this.ratesService.getAllCurrentRates();

    return {
      fullBasis: rates[ZusRateType.FULL_BASIS],
      smallZusBasis: rates[ZusRateType.SMALL_ZUS_BASIS],
      minimumWage: rates[ZusRateType.MINIMUM_WAGE],
      averageWage: rates[ZusRateType.AVERAGE_WAGE],
      healthMin: rates[ZusRateType.HEALTH_MIN],
      lumpSumTier1: rates[ZusRateType.LUMP_SUM_TIER_1],
      lumpSumTier2: rates[ZusRateType.LUMP_SUM_TIER_2],
      lumpSumTier3: rates[ZusRateType.LUMP_SUM_TIER_3],
      fullBasisPln: formatGroszeToPln(rates[ZusRateType.FULL_BASIS]),
      smallZusBasisPln: formatGroszeToPln(rates[ZusRateType.SMALL_ZUS_BASIS]),
      minimumWagePln: formatGroszeToPln(rates[ZusRateType.MINIMUM_WAGE]),
      healthMinPln: formatGroszeToPln(rates[ZusRateType.HEALTH_MIN]),
    };
  }
}

/**
 * Helper function to format grosze to PLN string
 */
function formatGroszeToPln(grosze: number): string {
  return (grosze / 100).toLocaleString('pl-PL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
