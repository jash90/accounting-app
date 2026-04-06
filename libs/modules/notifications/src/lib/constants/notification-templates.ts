/**
 * FIX-10: Centralized notification template strings.
 *
 * All notification title and action URL templates used in @NotifyOn() decorators.
 * Centralizing these enables future i18n support and prevents template drift.
 *
 * Usage in controllers:
 *   @NotifyOn({
 *     type: NotificationType.CLIENT_CREATED,
 *     ...NOTIFICATION_TEMPLATES.CLIENT.CREATED,
 *     recipientResolver: 'companyUsersExceptActor',
 *   })
 */
export const NOTIFICATION_TEMPLATES = {
  // ==================== Clients ====================
  CLIENT: {
    CREATED: {
      titleTemplate: '{{actor.firstName}} utworzył(a) klienta "{{name}}"',
      actionUrlTemplate: '/modules/clients/{{id}}',
    },
    UPDATED: {
      titleTemplate: '{{actor.firstName}} zaktualizował(a) klienta "{{name}}"',
      actionUrlTemplate: '/modules/clients/{{id}}',
    },
    DELETED: {
      titleTemplate: '{{actor.firstName}} usunął/usunęła klienta',
    },
    RESTORED: {
      titleTemplate: '{{actor.firstName}} przywrócił(a) klienta "{{name}}"',
      actionUrlTemplate: '/modules/clients/{{id}}',
    },
    SUSPENSION_CREATED: {
      titleTemplate: '{{actor.firstName}} utworzył(a) zawieszenie dla klienta',
      actionUrlTemplate: '/modules/clients/{{clientId}}',
    },
    SUSPENSION_UPDATED: {
      titleTemplate: '{{actor.firstName}} zaktualizował(a) zawieszenie klienta',
      actionUrlTemplate: '/modules/clients/{{clientId}}',
    },
    SUSPENSION_DELETED: {
      titleTemplate: '{{actor.firstName}} usunął/usunęła zawieszenie klienta',
      actionUrlTemplate: '/modules/clients/{{clientId}}',
    },
    RELIEF_CREATED: {
      titleTemplate: '{{actor.firstName}} dodał(a) ulgę dla klienta',
      actionUrlTemplate: '/modules/clients/{{clientId}}',
    },
    RELIEF_UPDATED: {
      titleTemplate: '{{actor.firstName}} zaktualizował(a) ulgę klienta',
      actionUrlTemplate: '/modules/clients/{{clientId}}',
    },
    RELIEF_DELETED: {
      titleTemplate: '{{actor.firstName}} usunął/usunęła ulgę klienta',
      actionUrlTemplate: '/modules/clients/{{clientId}}',
    },
  },

  // ==================== Tasks ====================
  TASK: {
    CREATED: {
      titleTemplate: '{{actor.firstName}} utworzył(a) zadanie "{{title}}"',
      actionUrlTemplate: '/modules/tasks/list?taskId={{id}}',
    },
    UPDATED: {
      titleTemplate: '{{actor.firstName}} zaktualizował(a) zadanie "{{title}}"',
      actionUrlTemplate: '/modules/tasks/list?taskId={{id}}',
    },
    DELETED: {
      titleTemplate: '{{actor.firstName}} usunął/usunęła zadanie',
    },
  },

  // ==================== Offers ====================
  OFFER: {
    CREATED: {
      titleTemplate: '{{actor.firstName}} utworzył(a) ofertę "{{title}}"',
      actionUrlTemplate: '/modules/offers/list?offerId={{id}}',
    },
    UPDATED: {
      titleTemplate: '{{actor.firstName}} zaktualizował(a) ofertę "{{title}}"',
      actionUrlTemplate: '/modules/offers/list?offerId={{id}}',
    },
    STATUS_CHANGED: {
      titleTemplate: '{{actor.firstName}} zmienił(a) status oferty "{{title}}"',
      actionUrlTemplate: '/modules/offers/list?offerId={{id}}',
    },
    DELETED: {
      titleTemplate: '{{actor.firstName}} usunął/usunęła ofertę',
    },
    DOCUMENT_GENERATED: {
      titleTemplate: '{{actor.firstName}} wygenerował(a) dokument oferty "{{title}}"',
      actionUrlTemplate: '/modules/offers/list?offerId={{id}}',
    },
    SENT: {
      titleTemplate: '{{actor.firstName}} wysłał(a) ofertę "{{title}}"',
      actionUrlTemplate: '/modules/offers/list?offerId={{id}}',
    },
    DUPLICATED: {
      titleTemplate: '{{actor.firstName}} zduplikował(a) ofertę',
      actionUrlTemplate: '/modules/offers/list?offerId={{id}}',
    },
  },

  // ==================== Leads ====================
  LEAD: {
    CREATED: {
      titleTemplate: '{{actor.firstName}} utworzył(a) lead "{{companyName}}"',
      actionUrlTemplate: '/modules/offers/leads?leadId={{id}}',
    },
    UPDATED: {
      titleTemplate: '{{actor.firstName}} zaktualizował(a) lead "{{companyName}}"',
      actionUrlTemplate: '/modules/offers/leads?leadId={{id}}',
    },
    DELETED: {
      titleTemplate: '{{actor.firstName}} usunął/usunęła lead',
    },
    CONVERTED: {
      titleTemplate: '{{actor.firstName}} przekonwertował(a) lead na klienta',
      actionUrlTemplate: '/modules/offers/leads?leadId={{id}}',
    },
  },

  // ==================== Settlements ====================
  SETTLEMENT: {
    MONTH_INITIALIZED: {
      titleTemplate: '{{actor.firstName}} zainicjalizował(a) miesiąc rozliczeń',
    },
    STATUS_CHANGED: {
      titleTemplate: '{{actor.firstName}} zmienił(a) status rozliczenia',
      actionUrlTemplate: '/modules/settlements?settlementId={{id}}',
    },
    UPDATED: {
      titleTemplate: '{{actor.firstName}} zaktualizował(a) rozliczenie',
      actionUrlTemplate: '/modules/settlements?settlementId={{id}}',
    },
    ASSIGNED: {
      titleTemplate: '{{actor.firstName}} przypisał(a) rozliczenie',
      actionUrlTemplate: '/modules/settlements?settlementId={{id}}',
    },
    BULK_ASSIGNED: {
      titleTemplate: '{{actor.firstName}} masowo przypisał(a) rozliczenia',
    },
    COMMENT_ADDED: {
      titleTemplate: '{{actor.firstName}} dodał(a) komentarz do rozliczenia',
      actionUrlTemplate: '/modules/settlements?settlementId={{id}}',
    },
  },

  // ==================== Time Tracking ====================
  TIME_ENTRY: {
    CREATED: {
      titleTemplate: '{{actor.firstName}} dodał(a) wpis czasu',
      actionUrlTemplate: '/modules/time-tracking/entries',
    },
    UPDATED: {
      titleTemplate: '{{actor.firstName}} zaktualizował(a) wpis czasu',
      actionUrlTemplate: '/modules/time-tracking/entries',
    },
    DELETED: {
      titleTemplate: '{{actor.firstName}} usunął/usunęła wpis czasu',
    },
    APPROVED: {
      titleTemplate: '{{actor.firstName}} zatwierdził(a) wpis czasu',
      actionUrlTemplate: '/modules/time-tracking/entries',
    },
    REJECTED: {
      titleTemplate: '{{actor.firstName}} odrzucił(a) wpis czasu',
      actionUrlTemplate: '/modules/time-tracking/entries',
    },
  },
} as const;
