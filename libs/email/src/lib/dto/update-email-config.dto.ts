import { PartialType } from '@nestjs/mapped-types';
import { CreateEmailConfigDto } from './create-email-config.dto';

/**
 * DTO for updating email configuration
 * All fields are optional for partial updates
 */
export class UpdateEmailConfigDto extends PartialType(CreateEmailConfigDto) {}
