import { ApiProperty } from '@nestjs/swagger';

import { IsArray, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class MoveMessagesDto {
  @ApiProperty({ type: [Number], description: 'UIDs of messages to move' })
  @IsArray()
  @IsNumber({}, { each: true })
  uids!: number[];

  @ApiProperty({ description: 'Source mailbox name' })
  @IsString()
  @IsNotEmpty()
  sourceMailbox!: string;

  @ApiProperty({ description: 'Destination mailbox name' })
  @IsString()
  @IsNotEmpty()
  destinationMailbox!: string;
}
