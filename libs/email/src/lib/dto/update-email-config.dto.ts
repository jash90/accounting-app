import { PartialType } from '@nestjs/swagger';
import { CreateEmailConfigDto } from './create-email-config.dto';

/**
 * DTO for updating email configuration
 * All fields are optional for partial updates
 */
export class UpdateEmailConfigDto extends PartialType(CreateEmailConfigDto) {}
