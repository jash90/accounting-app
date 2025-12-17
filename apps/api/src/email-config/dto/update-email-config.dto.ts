import { PartialType } from '@nestjs/swagger';
import { CreateEmailConfigDto } from './create-email-config.dto';

export class UpdateEmailConfigDto extends PartialType(CreateEmailConfigDto) {}
