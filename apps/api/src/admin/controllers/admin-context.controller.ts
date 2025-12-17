import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiBody,
} from '@nestjs/swagger';
import { AdminContextService, AdminContextDto } from '../services/admin-context.service';
import { Roles, CurrentUser } from '@accounting/auth';
import { RolesGuard } from '@accounting/auth';
import { UserRole, User } from '@accounting/common';
import { IsUUID, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class SwitchContextDto {
  @ApiProperty({
    description: 'ID firmy, na którą chcesz przełączyć kontekst',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  companyId!: string;
}

class ContextResponseDto {
  @ApiProperty({
    description: 'Aktualny kontekst firmy',
    nullable: true,
  })
  currentContext!: {
    companyId: string;
    companyName: string;
    isTestCompany: boolean;
    isSystemCompany: boolean;
  } | null;

  @ApiProperty({
    description: 'Lista dostępnych kontekstów do przełączenia',
    type: 'array',
  })
  availableContexts!: {
    companyId: string;
    companyName: string;
    isTestCompany: boolean;
    isSystemCompany: boolean;
  }[];
}

@ApiTags('Admin Context')
@ApiBearerAuth('JWT-auth')
@Controller('admin/context')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminContextController {
  constructor(private readonly adminContextService: AdminContextService) {}

  @Get()
  @ApiOperation({
    summary: 'Pobierz aktualny kontekst',
    description: 'Zwraca aktualny kontekst firmy admina oraz listę dostępnych kontekstów do przełączenia (System Admin i Firma Testowa)',
  })
  @ApiOkResponse({
    description: 'Aktualny kontekst i dostępne opcje',
    type: ContextResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Nieautoryzowany - nieprawidłowy lub brakujący token JWT' })
  @ApiForbiddenResponse({ description: 'Zabronione - wymagana rola ADMIN' })
  async getContext(@CurrentUser() user: User): Promise<AdminContextDto> {
    return this.adminContextService.getContext(user.id);
  }

  @Post('switch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Przełącz kontekst firmy',
    description: 'Przełącza kontekst admina na wybraną firmę (Firma Testowa lub System Admin). Po przełączeniu wszystkie operacje biznesowe będą wykonywane w kontekście wybranej firmy.',
  })
  @ApiBody({ type: SwitchContextDto })
  @ApiOkResponse({
    description: 'Kontekst przełączony pomyślnie',
    type: ContextResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Nieprawidłowe dane wejściowe lub nieaktywna firma' })
  @ApiNotFoundResponse({ description: 'Firma nie znaleziona' })
  @ApiUnauthorizedResponse({ description: 'Nieautoryzowany - nieprawidłowy lub brakujący token JWT' })
  @ApiForbiddenResponse({ description: 'Zabronione - wymagana rola ADMIN lub brak dostępu do tej firmy' })
  async switchContext(
    @CurrentUser() user: User,
    @Body() dto: SwitchContextDto,
  ): Promise<AdminContextDto> {
    return this.adminContextService.switchContext(user.id, dto.companyId);
  }

  @Post('reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resetuj kontekst do domyślnego',
    description: 'Resetuje kontekst admina do domyślnego (System Admin). Usuwa aktywną firmę testową.',
  })
  @ApiOkResponse({
    description: 'Kontekst zresetowany pomyślnie',
    type: ContextResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Nieautoryzowany - nieprawidłowy lub brakujący token JWT' })
  @ApiForbiddenResponse({ description: 'Zabronione - wymagana rola ADMIN' })
  async resetContext(@CurrentUser() user: User): Promise<AdminContextDto> {
    return this.adminContextService.resetContext(user.id);
  }
}
