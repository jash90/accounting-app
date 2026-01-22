/**
 * Notification Types and DTOs for frontend
 *
 * IMPORTANT: This enum must be kept in sync with the backend definition at:
 * libs/common/src/lib/enums/notification-type.enum.ts
 *
 * Due to moduleResolution: "bundler" constraints in the web app's TypeScript config,
 * we cannot import directly from @accounting/common. If you modify the NotificationType
 * enum in the backend, please update this file as well.
 */

// Notification type enum - KEEP IN SYNC with libs/common/src/lib/enums/notification-type.enum.ts
export enum NotificationType {
  // ========================================
  // TASKS MODULE
  // ========================================
  TASK_CREATED = 'task.created',
  TASK_UPDATED = 'task.updated',
  TASK_DELETED = 'task.deleted',
  TASK_ASSIGNED = 'task.assigned',
  TASK_UNASSIGNED = 'task.unassigned',
  TASK_COMPLETED = 'task.completed',
  TASK_REOPENED = 'task.reopened',
  TASK_OVERDUE = 'task.overdue',
  TASK_DUE_SOON = 'task.due_soon',
  TASK_COMMENT_ADDED = 'task.comment.added',
  TASK_COMMENT_MENTIONED = 'task.comment.mentioned',
  TASK_BULK_UPDATED = 'task.bulk.updated',
  TASK_BULK_DELETED = 'task.bulk.deleted',

  // ========================================
  // CLIENTS MODULE
  // ========================================
  CLIENT_CREATED = 'client.created',
  CLIENT_UPDATED = 'client.updated',
  CLIENT_DELETED = 'client.deleted',
  CLIENT_RESTORED = 'client.restored',
  CLIENT_BULK_UPDATED = 'client.bulk.updated',
  CLIENT_BULK_DELETED = 'client.bulk.deleted',
  CLIENT_DELETE_REQUESTED = 'client.delete.requested',
  CLIENT_DELETE_APPROVED = 'client.delete.approved',
  CLIENT_DELETE_REJECTED = 'client.delete.rejected',

  // ========================================
  // TIME TRACKING MODULE
  // ========================================
  TIME_ENTRY_CREATED = 'time.entry.created',
  TIME_ENTRY_UPDATED = 'time.entry.updated',
  TIME_ENTRY_DELETED = 'time.entry.deleted',
  TIME_ENTRY_APPROVED = 'time.entry.approved',
  TIME_ENTRY_REJECTED = 'time.entry.rejected',
  TIME_ENTRY_SUBMITTED = 'time.entry.submitted',

  // ========================================
  // EMAIL CLIENT MODULE
  // ========================================
  EMAIL_RECEIVED = 'email.received',
  EMAIL_SEND_FAILED = 'email.send.failed',

  // ========================================
  // AI AGENT MODULE
  // ========================================
  AI_TOKEN_LIMIT_WARNING = 'ai.token.limit.warning',
  AI_TOKEN_LIMIT_REACHED = 'ai.token.limit.reached',

  // ========================================
  // COMPANY / USER MANAGEMENT
  // ========================================
  USER_INVITED = 'user.invited',
  USER_JOINED = 'user.joined',
  USER_REMOVED = 'user.removed',
  USER_ROLE_CHANGED = 'user.role.changed',
  MODULE_ACCESS_GRANTED = 'module.access.granted',
  MODULE_ACCESS_REVOKED = 'module.access.revoked',
  PERMISSION_GRANTED = 'permission.granted',
  PERMISSION_REVOKED = 'permission.revoked',

  // ========================================
  // SYSTEM
  // ========================================
  SYSTEM_ANNOUNCEMENT = 'system.announcement',
  SYSTEM_MAINTENANCE = 'system.maintenance',
  SYSTEM_UPDATE = 'system.update',
}

/**
 * Human-readable labels for notification types (Polish)
 * KEEP IN SYNC with libs/common/src/lib/enums/notification-type.enum.ts
 */
export const NotificationTypeLabels: Record<NotificationType, string> = {
  // Tasks
  [NotificationType.TASK_CREATED]: 'Utworzono zadanie',
  [NotificationType.TASK_UPDATED]: 'Zaktualizowano zadanie',
  [NotificationType.TASK_DELETED]: 'Usunięto zadanie',
  [NotificationType.TASK_ASSIGNED]: 'Przypisano zadanie',
  [NotificationType.TASK_UNASSIGNED]: 'Usunięto przypisanie zadania',
  [NotificationType.TASK_COMPLETED]: 'Ukończono zadanie',
  [NotificationType.TASK_REOPENED]: 'Wznowiono zadanie',
  [NotificationType.TASK_OVERDUE]: 'Zadanie przeterminowane',
  [NotificationType.TASK_DUE_SOON]: 'Zbliża się termin zadania',
  [NotificationType.TASK_COMMENT_ADDED]: 'Dodano komentarz do zadania',
  [NotificationType.TASK_COMMENT_MENTIONED]: 'Wspomniano Cię w komentarzu',
  [NotificationType.TASK_BULK_UPDATED]: 'Zaktualizowano wiele zadań',
  [NotificationType.TASK_BULK_DELETED]: 'Usunięto wiele zadań',

  // Clients
  [NotificationType.CLIENT_CREATED]: 'Utworzono klienta',
  [NotificationType.CLIENT_UPDATED]: 'Zaktualizowano klienta',
  [NotificationType.CLIENT_DELETED]: 'Usunięto klienta',
  [NotificationType.CLIENT_RESTORED]: 'Przywrócono klienta',
  [NotificationType.CLIENT_BULK_UPDATED]: 'Zaktualizowano wielu klientów',
  [NotificationType.CLIENT_BULK_DELETED]: 'Usunięto wielu klientów',
  [NotificationType.CLIENT_DELETE_REQUESTED]: 'Żądanie usunięcia klienta',
  [NotificationType.CLIENT_DELETE_APPROVED]: 'Zatwierdzono usunięcie klienta',
  [NotificationType.CLIENT_DELETE_REJECTED]: 'Odrzucono usunięcie klienta',

  // Time Tracking
  [NotificationType.TIME_ENTRY_CREATED]: 'Utworzono wpis czasu',
  [NotificationType.TIME_ENTRY_UPDATED]: 'Zaktualizowano wpis czasu',
  [NotificationType.TIME_ENTRY_DELETED]: 'Usunięto wpis czasu',
  [NotificationType.TIME_ENTRY_APPROVED]: 'Zatwierdzono wpis czasu',
  [NotificationType.TIME_ENTRY_REJECTED]: 'Odrzucono wpis czasu',
  [NotificationType.TIME_ENTRY_SUBMITTED]: 'Przesłano wpis czasu do zatwierdzenia',

  // Email
  [NotificationType.EMAIL_RECEIVED]: 'Otrzymano nową wiadomość',
  [NotificationType.EMAIL_SEND_FAILED]: 'Nie udało się wysłać wiadomości',

  // AI
  [NotificationType.AI_TOKEN_LIMIT_WARNING]: 'Zbliżasz się do limitu tokenów AI',
  [NotificationType.AI_TOKEN_LIMIT_REACHED]: 'Osiągnięto limit tokenów AI',

  // Company/User
  [NotificationType.USER_INVITED]: 'Zaproszono użytkownika',
  [NotificationType.USER_JOINED]: 'Użytkownik dołączył do firmy',
  [NotificationType.USER_REMOVED]: 'Usunięto użytkownika',
  [NotificationType.USER_ROLE_CHANGED]: 'Zmieniono rolę użytkownika',
  [NotificationType.MODULE_ACCESS_GRANTED]: 'Przyznano dostęp do modułu',
  [NotificationType.MODULE_ACCESS_REVOKED]: 'Odebrano dostęp do modułu',
  [NotificationType.PERMISSION_GRANTED]: 'Przyznano uprawnienia',
  [NotificationType.PERMISSION_REVOKED]: 'Odebrano uprawnienia',

  // System
  [NotificationType.SYSTEM_ANNOUNCEMENT]: 'Ogłoszenie systemowe',
  [NotificationType.SYSTEM_MAINTENANCE]: 'Planowana przerwa techniczna',
  [NotificationType.SYSTEM_UPDATE]: 'Aktualizacja systemu',
};

/**
 * Get module slug from notification type
 * KEEP IN SYNC with libs/common/src/lib/enums/notification-type.enum.ts
 */
export function getModuleFromNotificationType(type: NotificationType): string {
  const prefix = type.split('.')[0];
  const moduleMap: Record<string, string> = {
    task: 'tasks',
    client: 'clients',
    time: 'time-tracking',
    email: 'email-client',
    ai: 'ai-agent',
    user: 'company',
    module: 'company',
    permission: 'company',
    system: 'system',
  };
  return moduleMap[prefix] || 'system';
}

/**
 * Check if notification type is a batch type
 * KEEP IN SYNC with libs/common/src/lib/enums/notification-type.enum.ts
 */
export function isBatchNotificationType(type: NotificationType): boolean {
  return type.includes('.bulk.');
}

// Notification data interface
export interface NotificationData {
  entityId?: string;
  entityType?: string;
  items?: Array<{
    id: string;
    title?: string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

// Actor information
export interface NotificationActorDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

// Main notification response DTO
export interface NotificationResponseDto {
  id: string;
  recipientId: string;
  companyId: string;
  type: NotificationType;
  moduleSlug: string;
  title: string;
  message: string | null;
  data: NotificationData | null;
  actionUrl: string | null;
  isRead: boolean;
  readAt: string | null;
  isArchived: boolean;
  archivedAt: string | null;
  emailSent: boolean;
  emailSentAt: string | null;
  actor: NotificationActorDto | null;
  isBatch: boolean;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

// Filters for listing notifications
export interface NotificationFiltersDto {
  page?: number;
  limit?: number;
  type?: NotificationType;
  moduleSlug?: string;
  isRead?: boolean;
  isArchived?: boolean;
}

// Paginated response
export interface PaginatedNotificationsDto {
  data: NotificationResponseDto[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Notification settings
export interface NotificationTypePreference {
  inApp: boolean;
  email: boolean;
}

export interface NotificationSettingsResponseDto {
  id: string;
  userId: string;
  companyId: string;
  moduleSlug: string;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  receiveOnCreate: boolean;
  receiveOnUpdate: boolean;
  receiveOnDelete: boolean;
  receiveOnTaskCompleted: boolean;
  receiveOnTaskOverdue: boolean;
  isAdminCopy: boolean;
  typePreferences: Record<NotificationType, NotificationTypePreference> | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateNotificationSettingsDto {
  inAppEnabled?: boolean;
  emailEnabled?: boolean;
  typePreferences?: Record<NotificationType, NotificationTypePreference>;
}
