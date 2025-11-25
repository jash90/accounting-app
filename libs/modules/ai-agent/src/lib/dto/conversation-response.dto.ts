import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AIMessageRole } from '@accounting/common';

class UserBasicInfoDto {
  @ApiProperty({ description: 'User ID' })
  id: string;

  @ApiProperty({ description: 'User email' })
  email: string;

  @ApiProperty({ description: 'User first name' })
  firstName: string;

  @ApiProperty({ description: 'User last name' })
  lastName: string;
}

class CompanyBasicInfoDto {
  @ApiProperty({ description: 'Company ID' })
  id: string;

  @ApiProperty({ description: 'Company name' })
  name: string;

  @ApiProperty({ description: 'Is this the System Admin company' })
  isSystemCompany: boolean;
}

export class MessageResponseDto {
  @ApiProperty({ description: 'Message ID' })
  id: string;

  @ApiProperty({ description: 'Conversation ID' })
  conversationId: string;

  @ApiProperty({
    description: 'Message role',
    enum: AIMessageRole,
  })
  role: AIMessageRole;

  @ApiProperty({ description: 'Message content' })
  content: string;

  @ApiProperty({ description: 'Input tokens used' })
  inputTokens: number;

  @ApiProperty({ description: 'Output tokens generated' })
  outputTokens: number;

  @ApiProperty({ description: 'Total tokens' })
  totalTokens: number;

  @ApiPropertyOptional({
    description: 'User who sent the message (for user messages)',
    type: UserBasicInfoDto,
  })
  user: UserBasicInfoDto | null;

  @ApiPropertyOptional({
    description: 'Context IDs used for RAG',
    type: [String],
  })
  contextUsed: string[] | null;

  @ApiProperty({ description: 'Message timestamp' })
  createdAt: Date;
}

export class ConversationResponseDto {
  @ApiProperty({ description: 'Conversation ID' })
  id: string;

  @ApiProperty({ description: 'Conversation title' })
  title: string;

  @ApiPropertyOptional({ description: 'Company ID (nullable for System Admin entries)' })
  companyId: string | null;

  @ApiPropertyOptional({
    description: 'Company details',
    type: CompanyBasicInfoDto,
  })
  company: CompanyBasicInfoDto | null;

  @ApiProperty({
    description: 'User who created the conversation',
    type: UserBasicInfoDto,
  })
  createdBy: UserBasicInfoDto;

  @ApiProperty({
    description: 'Messages in the conversation',
    type: [MessageResponseDto],
  })
  messages: MessageResponseDto[];

  @ApiProperty({ description: 'Total tokens used in conversation' })
  totalTokens: number;

  @ApiProperty({ description: 'Number of messages' })
  messageCount: number;

  @ApiProperty({ description: 'Is conversation archived' })
  isArchived: boolean;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}
