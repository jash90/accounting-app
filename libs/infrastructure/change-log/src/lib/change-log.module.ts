import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChangeLog } from '@accounting/common';
import { ChangeLogService } from './services/change-log.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([ChangeLog])],
  providers: [ChangeLogService],
  exports: [ChangeLogService],
})
export class ChangeLogModule {}
