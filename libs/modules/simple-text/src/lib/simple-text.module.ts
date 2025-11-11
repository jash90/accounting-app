import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SimpleText, User } from '@accounting/common';
import { SimpleTextController } from './controllers/simple-text.controller';
import { SimpleTextService } from './services/simple-text.service';
import { RBACModule } from '@accounting/rbac';

@Module({
  imports: [TypeOrmModule.forFeature([SimpleText, User]), RBACModule],
  controllers: [SimpleTextController],
  providers: [SimpleTextService],
  exports: [SimpleTextService],
})
export class SimpleTextModule {}
