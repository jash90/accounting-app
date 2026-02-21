import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Company, Notification, NotificationSettings, User } from '@accounting/common';
import { CommonModule } from '@accounting/common/backend';
import { EmailModule } from '@accounting/email';
import { RBACModule } from '@accounting/rbac';

import { NotificationSettingsController } from './controllers/notification-settings.controller';
import { NotificationsController } from './controllers/notifications.controller';
import { NotificationGateway } from './gateways/notification.gateway';
import { NotificationInterceptor } from './interceptors/notification.interceptor';
import { NotificationListener } from './listeners/notification.listener';
import { EmailChannelService } from './services/email-channel.service';
import { NotificationDispatcherService } from './services/notification-dispatcher.service';
import { NotificationSettingsService } from './services/notification-settings.service';
import { NotificationService } from './services/notification.service';

/**
 * NotificationsModule - Global module for cross-module notification dispatch.
 *
 * @Global() is used because:
 * 1. NotificationDispatcherService must be injectable in any module (clients, tasks, time-tracking)
 *    without requiring explicit imports in each consuming module
 * 2. Event listeners need to be registered once at application startup
 * 3. WebSocket gateway requires a single instance for all connections
 *
 * Services exported globally:
 * - NotificationService - for reading/managing notifications
 * - NotificationSettingsService - for checking user preferences before dispatch
 * - NotificationDispatcherService - for dispatching notifications from any module
 * - NotificationGateway - for WebSocket real-time delivery
 * - NotificationInterceptor - for automatic notification dispatch on controller actions
 *
 * Note: EventEmitterModule is configured here with wildcard support for
 * namespace-based event routing (e.g., 'notification.created', 'notification.email.send')
 */
@Global()
@Module({
  imports: [
    // Register all entities (including Company for System Admin Company pattern)
    TypeOrmModule.forFeature([Notification, NotificationSettings, User, Company]),
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      maxListeners: 20,
      verboseMemoryLeak: true,
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const expiresIn = configService.get<string>('JWT_EXPIRES_IN') || '1d';
        return {
          secret: configService.get<string>('JWT_SECRET'),
          signOptions: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- @nestjs/jwt StringValue type is overly strict
            expiresIn: expiresIn as any,
          },
        };
      },
      inject: [ConfigService],
    }),
    EmailModule,
    RBACModule,
    CommonModule,
  ],
  controllers: [NotificationsController, NotificationSettingsController],
  providers: [
    // SystemCompanyService is provided by CommonModule
    NotificationService,
    NotificationSettingsService,
    NotificationDispatcherService,
    EmailChannelService,
    NotificationGateway,
    NotificationInterceptor,
    NotificationListener,
  ],
  exports: [
    NotificationService,
    NotificationSettingsService,
    NotificationDispatcherService,
    NotificationGateway,
    NotificationInterceptor,
  ],
})
export class NotificationsModule {}
