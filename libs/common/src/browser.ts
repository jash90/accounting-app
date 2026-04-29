// Browser-safe exports that can be used in frontend code
// These exports do NOT include any Node.js-specific or TypeORM dependencies

// Constants (browser-safe, pure data)
export * from './lib/constants/pkd-codes';
export * from './lib/constants/gtu-codes';

// Note: NotificationType enum is defined in libs/common/src/lib/enums/notification-type.enum.ts
// and duplicated in apps/web/src/types/notifications.ts for frontend use due to
// moduleResolution: "bundler" constraints. Both files should be kept in sync.

// KSeF enums (browser-safe, pure data — no TypeORM/NestJS dependencies)
export * from './lib/enums/ksef-environment.enum';
export * from './lib/enums/ksef-auth-method.enum';
export * from './lib/enums/ksef-invoice-status.enum';
export * from './lib/enums/ksef-invoice-type.enum';
export * from './lib/enums/ksef-invoice-direction.enum';
export * from './lib/enums/ksef-session-status.enum';
export * from './lib/enums/ksef-session-type.enum';
