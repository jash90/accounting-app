import { ApiProperty } from '@nestjs/swagger';

import { NotificationData, NotificationType } from '@accounting/common';

class ActorBasicInfoDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;
}

export class NotificationResponseDto {
  @ApiProperty({ description: 'Notification ID' })
  id!: string;

  @ApiProperty({ description: 'Recipient user ID' })
  recipientId!: string;

  @ApiProperty({ description: 'Company ID' })
  companyId!: string;

  @ApiProperty({ enum: NotificationType, description: 'Notification type' })
  type!: NotificationType;

  @ApiProperty({ description: 'Module slug' })
  moduleSlug!: string;

  @ApiProperty({ description: 'Notification title' })
  title!: string;

  @ApiProperty({ description: 'Notification message', nullable: true })
  message!: string | null;

  @ApiProperty({ description: 'Additional data', nullable: true })
  data!: NotificationData | null;

  @ApiProperty({ description: 'Action URL', nullable: true })
  actionUrl!: string | null;

  @ApiProperty({ description: 'Is read' })
  isRead!: boolean;

  @ApiProperty({ description: 'Read timestamp', nullable: true })
  readAt!: Date | null;

  @ApiProperty({ description: 'Is archived' })
  isArchived!: boolean;

  @ApiProperty({ description: 'Archived timestamp', nullable: true })
  archivedAt!: Date | null;

  @ApiProperty({ description: 'Email was sent' })
  emailSent!: boolean;

  @ApiProperty({ description: 'Email sent timestamp', nullable: true })
  emailSentAt!: Date | null;

  @ApiProperty({
    description: 'Actor who triggered the notification',
    type: ActorBasicInfoDto,
    nullable: true,
  })
  actor!: ActorBasicInfoDto | null;

  @ApiProperty({ description: 'Is batch notification' })
  isBatch!: boolean;

  @ApiProperty({ description: 'Number of items' })
  itemCount!: number;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Updated timestamp' })
  updatedAt!: Date;
}

export class UnreadCountResponseDto {
  @ApiProperty({ description: 'Number of unread notifications' })
  count!: number;
}
