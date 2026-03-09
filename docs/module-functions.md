# Module Functions Reference

Complete inventory of all service and controller functions across the accounting Nx monorepo.

## Table of Contents

1. [libs/modules/clients](#libsmodulesclients)
2. [libs/modules/tasks](#libsmodulestasks)
3. [libs/modules/settlements](#libsmodulessettlements)
4. [libs/modules/offers](#libsmodulesoffers)
5. [libs/modules/documents](#libsmodulesdocuments)
6. [libs/modules/time-tracking](#libsmodulestime-tracking)
7. [libs/modules/email-client](#libsmodulesemail-client)
8. [libs/modules/notifications](#libsmodulesnotifications)
9. [libs/modules/ai-agent](#libsmodulesai-agent)
10. [libs/auth](#libsauth)
11. [libs/rbac](#libsrbac)
12. [libs/email](#libsemail)
13. [libs/common](#libscommon)
14. [apps/api/src/admin](#appsapisrcadmin)
15. [apps/api/src/company](#appsapisrccompany)
16. [apps/api/src/modules](#appsapisrcmodules)
17. [apps/api/src/email-config](#appsapisrcemail-config)

---

## libs/modules/clients

### ClientsService

- `applyCustomFieldFilters`
- `bulkDelete`
- `bulkEdit`
- `bulkRestore`
- `create`
- `findAll`
- `findOne`
- `getPkdSections`
- `hardDelete`
- `restore`
- `sanitizeClientForLog`
- `searchPkdCodes`
- `softDeleteClient`
- `update`

### CustomFieldsService

- `createDefinition`
- `findAllDefinitions`
- `findDefinitionById`
- `getClientCustomFields`
- `handleDateRangeReminder`
- `hardDeleteDefinition`
- `setCustomFieldValue`
- `setMultipleCustomFieldValues`
- `softDeleteCustomFieldValue`
- `softDeleteDefinition`
- `updateDefinition`
- `validateFieldValue`

### ClientExportService

- `exportToCsv`
- `generateCsv`
- `generateCsvImportTemplate`
- `importFromCsv`
- `mapRowToClient`
- `parseCsvForImportPreview`
- `sanitizeClientForLog`
- `validateRow`

### DuplicateDetectionService

- `checkDuplicates`
- `isEmailTaken`
- `isNipTaken`

### ClientStatisticsService

- `getClientTaskAndTimeStats`
- `getStatistics`
- `getStatisticsWithRecent`
- `initializeEnumCounts`

### ClientIconsService

- `assignIcon`
- `createIcon`
- `findAllIcons`
- `findIconById`
- `getClientIcons`
- `getIconUrl`
- `removeIcon`
- `setClientIcons`
- `unassignIcon`
- `updateIcon`

### ClientChangelogService

- `calculateChanges`
- `compileClientWelcomeTemplate`
- `compileTemplate`
- `formatDatePolish`
- `getClientChangelog`
- `getCompanyChangelog`
- `getNotificationRecipients`
- `hasChanged`
- `notifyBulkClientsDeleted`
- `notifyBulkClientsUpdated`
- `notifyClientCreated`
- `notifyClientDeleted`
- `notifyClientUpdated`
- `notifyCompanyUsersWithCompanySmtp`
- `sendWelcomeEmailToClient`

### SuspensionService

- `checkOverlap`
- `create`
- `findAll`
- `findOne`
- `getCompanyEmployees`
- `getCompanyOwners`
- `getCurrentSuspension`
- `getSuspensionsFor1DayEndReminder`
- `getSuspensionsFor1DayStartReminder`
- `getSuspensionsFor7DayEndReminder`
- `getSuspensionsFor7DayStartReminder`
- `getSuspensionsForResumptionNotification`
- `isClientSuspended`
- `mapToResponseDto`
- `markReminderSent`
- `remove`
- `update`
- `validateNoOverlap`
- `validateNoOverlapWithManager`

### ReliefPeriodService

- `calculateEndDate`
- `create`
- `findAll`
- `findOne`
- `getActiveReliefByType`
- `getCompanyEmployees`
- `getCompanyOwners`
- `getReliefsFor1DayEndReminder`
- `getReliefsFor7DayEndReminder`
- `mapToResponseDto`
- `markReminderSent`
- `remove`
- `update`

### NotificationSettingsService (clients)

- `deleteSettings`
- `disableAllNotifications`
- `enableAllNotifications`
- `getAllSettingsForModule`
- `getSettings`
- `setUserSettings`
- `updateSettings`

### AutoAssignService

- `addAutoAssignment`
- `evaluateAndAssign`
- `processBatch`
- `processIconReevaluationAsync`
- `reevaluateIconForAllClients`
- `removeStaleAutoAssignments`

### ConditionEvaluatorService

- `evaluate`
- `evaluateGroup`
- `evaluateOperator`
- `evaluateSingle`
- `getFieldValue`
- `isEmpty`
- `normalizeValue`

### DeleteRequestService

- `approveRequest`
- `cancelRequest`
- `createDeleteRequest`
- `findAllPendingRequests`
- `findAllRequests`
- `findRequestById`
- `getMyRequests`
- `rejectRequest`

### ReliefPeriodReminderService

- `checkReliefReminders`
- `formatDate`
- `getReliefLabel`
- `send1DayEndReminders`
- `send7DayEndReminders`
- `sendReminderToAllUsers`

### SuspensionReminderService

- `checkSuspensionReminders`
- `formatDate`
- `send1DayEndReminders`
- `send1DayStartReminders`
- `send7DayEndReminders`
- `send7DayStartReminders`
- `sendNotificationToOwner`
- `sendReminderToEmployees`
- `sendResumptionNotifications`

### CustomFieldReminderService

- `checkCustomFieldReminders`
- `deleteReminder`
- `formatDate`
- `getCompanyEmployees`
- `getCompanyOwners`
- `getRemindersFor1DayEndReminder`
- `getRemindersFor7DayEndReminder`
- `markReminderSent`
- `send1DayEndReminders`
- `send7DayEndReminders`
- `sendReminderToAllUsers`
- `upsertReminder`

### ClientsController

- `bulkDelete`
- `bulkEdit`
- `bulkRestore`
- `checkDuplicates`
- `create`
- `exportToCsv`
- `findAll`
- `findOne`
- `getAllHistory`
- `getChangelog`
- `getClientTaskTimeStats`
- `getCustomFields`
- `getImportTemplate`
- `getPkdSections`
- `getStatistics`
- `importFromCsv`
- `parseCustomFieldFilters`
- `remove`
- `requestDelete`
- `restore`
- `searchPkdCodes`
- `setCustomFields`
- `update`

### FieldDefinitionsController

- `create`
- `findAll`
- `findOne`
- `remove`
- `update`

### IconsController

- `assignIcon`
- `create`
- `findAll`
- `findOne`
- `getClientIcons`
- `getUrl`
- `remove`
- `unassignIcon`
- `update`

### SuspensionsController

- `create`
- `findAll`
- `findOne`
- `remove`
- `update`

### ReliefPeriodsController

- `create`
- `findAll`
- `findOne`
- `remove`
- `update`

### NotificationSettingsController (clients)

- `createSettings`
- `deleteMySettings`
- `disableAll`
- `enableAll`
- `getMySettings`
- `getSettings`
- `updateMySettings`
- `updateSettings`

### DeleteRequestsController

- `approve`
- `cancel`
- `findAll`
- `findMyRequests`
- `findOne`
- `findPending`
- `reject`

---

## libs/modules/tasks

### TasksService

- `bulkUpdateStatus`
- `create`
- `findAll`
- `findOne`
- `getCalendarTasks`
- `getClientTaskStatistics`
- `getGlobalStatistics`
- `getKanbanBoard`
- `getSubtasks`
- `isDescendant`
- `reorderTasks`
- `sanitizeTaskForLog`
- `softDeleteTask`
- `update`
- `validateAssigneeOwnership`
- `validateStatusTransition`

### TaskLabelsService

- `create`
- `findAll`
- `findOne`
- `softDeleteTaskLabel`
- `update`

### TaskCommentsService

- `create`
- `findAllForTask`
- `remove`
- `update`

### TaskDependenciesService

- `create`
- `findAllForTask`
- `findBlockedBy`
- `findBlocking`
- `remove`
- `wouldCreateCycle`

### TaskTemplateService

- `create`
- `createTaskFromTemplate`
- `findAll`
- `findOne`
- `softDeleteTaskTemplate`
- `update`

### TaskRecurrenceService

- `createOccurrence`
- `processRecurringTasks`
- `shouldCreateToday`

### TaskExportService

- `exportToCsv`
- `generateCsv`

### TaskExtendedStatsService

- `getCompletionDurationStats`
- `getEmployeeCompletionRanking`
- `getStatusDurationRanking`

### TasksLookupService

- `getAssignees`
- `getClients`

### TaskNotificationService

- `calculateChanges`
- `compileTemplate`
- `formatDatePolish`
- `formatValue`
- `getNotificationRecipients`
- `hasChanged`
- `notifyTaskCompleted`
- `notifyTaskCreated`
- `notifyTaskDeleted`
- `notifyTaskOverdue`
- `notifyTaskUpdated`

### TaskDeadlineNotificationsService

- `processDueSoonTasks`
- `processOverdueTasks`

### TasksController

- `bulkUpdateStatus`
- `create`
- `exportToCsv`
- `findAll`
- `findOne`
- `getCalendar`
- `getClientStatistics`
- `getCompletionDurationStats`
- `getEmployeeCompletionRanking`
- `getGlobalStatistics`
- `getKanban`
- `getStatusDurationRanking`
- `getSubtasks`
- `remove`
- `reorder`
- `update`

### TaskLabelsController

- `create`
- `findAll`
- `findOne`
- `remove`
- `update`

### TaskCommentsController

- `create`
- `findAll`
- `remove`
- `update`

### TaskDependenciesController

- `create`
- `findAll`
- `getBlockedBy`
- `getBlocking`
- `remove`

### TaskTemplatesController

- `create`
- `createFromTemplate`
- `delete`
- `findAll`
- `findOne`
- `update`

### TasksLookupController

- `getAssignees`
- `getClients`

---

## libs/modules/settlements

### SettlementsService

- `assignToEmployee`
- `bulkAssign`
- `createMonthlySettlements`
- `findAll`
- `findOne`
- `getAllAssignableUsers`
- `getAssignableUsers`
- `sendMissingInvoiceEmail`
- `update`
- `updateStatus`

### SettlementCommentsService

- `addComment`
- `getComments`

### SettlementExportService

- `exportToCsv`
- `generateCsv`

### SettlementStatsService

- `getEmployeeStats`
- `getMyStats`
- `getOverviewStats`

### SettlementExtendedStatsService

- `getBlockedClientsStats`
- `getCompletionDurationStats`
- `getEmployeeCompletionRanking`

### SettlementSettingsService

- `getSettings`
- `toResponseDto`
- `updateSettings`

### SettlementsController

- `addComment`
- `assignToEmployee`
- `bulkAssign`
- `exportToCsv`
- `findAll`
- `findOne`
- `getAllAssignableUsers`
- `getAssignableUsers`
- `getBlockedClientsStats`
- `getComments`
- `getEmployeeStats`
- `getMyStats`
- `getOverviewStats`
- `getSettings`
- `getSettlementCompletionDurationStats`
- `getSettlementEmployeeRanking`
- `initializeMonth`
- `sendMissingInvoiceEmail`
- `update`
- `updateSettings`
- `updateStatus`

---

## libs/modules/offers

### OffersService

- `buildRecipientSnapshot`
- `calculateItemNetAmount`
- `calculateTotals`
- `create`
- `downloadDocument`
- `duplicate`
- `findAll`
- `findOne`
- `generateDocument`
- `getActivities`
- `getStatistics`
- `remove`
- `sendOffer`
- `update`
- `updateStatus`

### LeadsService

- `convertToClient`
- `create`
- `findAll`
- `findOne`
- `getStatistics`
- `remove`
- `update`

### OfferTemplatesService

- `create`
- `downloadTemplateFile`
- `findAll`
- `findDefault`
- `findOne`
- `getContentBlocks`
- `getStandardPlaceholders`
- `remove`
- `update`
- `updateContentBlocks`
- `uploadTemplateFile`

### OfferActivityService

- `getOfferActivities`
- `logActivity`
- `logComment`
- `logCreated`
- `logDocumentGenerated`
- `logDuplicated`
- `logEmailSent`
- `logStatusChanged`
- `logUpdated`
- `logViewed`

### OfferEmailService

- `buildDefaultBody`
- `buildDefaultSubject`
- `getSendEligibility`
- `getSmtpConfig`
- `sendOffer`

### OfferExportService

- `exportLeadsToCsv`
- `exportOffersToCsv`
- `generateLeadsCsv`
- `generateOffersCsv`

### OfferNumberingService

- `generateOfferNumber`

### DocxGenerationService

- `buildFullAddress`
- `buildPlaceholderData`
- `buildServiceItemsPlaceholders`
- `createContentTypesXml`
- `createDocumentRelsXml`
- `createMinimalDocxContent`
- `createParagraph`
- `createRelsXml`
- `createStylesXml`
- `escapeXml`
- `formatCurrency`
- `formatDate`
- `generateFromBlocks`
- `generateFromTemplate`
- `generatePlainTextFallback`
- `generateSimpleDocument`
- `isValidDocxMagicBytes`
- `loadDependencies`
- `onModuleInit`
- `sanitizePlaceholderValue`
- `validateCustomPlaceholders`

### DocxBlockRendererService

- `contentTypesXml`
- `documentRelsXml`
- `escapeXml`
- `mapAlignment`
- `numberingXml`
- `onModuleInit`
- `paragraphProperties`
- `relsXml`
- `renderAttachmentSection`
- `renderBlock`
- `renderBlocksToDocx`
- `renderClientData`
- `renderHeading`
- `renderList`
- `renderParagraph`
- `renderSeparator`
- `renderSignature`
- `renderTable`
- `renderTableRow`
- `renderTextRuns`
- `stylesXml`
- `substitutePlaceholders`
- `wrapBody`

### OffersController

- `create`
- `downloadDocument`
- `duplicate`
- `exportToCsv`
- `findAll`
- `findOne`
- `generateDocument`
- `getActivities`
- `getStatistics`
- `remove`
- `sendOffer`
- `update`
- `updateStatus`

### LeadsController

- `convertToClient`
- `create`
- `exportToCsv`
- `findAll`
- `findOne`
- `getStatistics`
- `remove`
- `update`

### OfferTemplatesController

- `create`
- `downloadTemplateFile`
- `findAll`
- `findDefault`
- `findOne`
- `getContentBlocks`
- `getStandardPlaceholders`
- `remove`
- `update`
- `updateContentBlocks`
- `uploadTemplateFile`

---

## libs/modules/documents

### DocumentTemplatesService

- `create`
- `findAll`
- `findOne`
- `getContentBlocks`
- `remove`
- `update`
- `updateContentBlocks`

### GeneratedDocumentsService

- `findAll`
- `findOne`
- `generate`
- `generatePdf`
- `getRenderedContent`
- `remove`
- `renderBlocksAsMarkdown`
- `resolveBlockPlaceholders`

### DocumentPdfService

- `generatePdfFromBlocks`
- `generatePdfFromText`
- `mapBlock`
- `mapTextRuns`

### DocumentTemplatesController

- `create`
- `findAll`
- `findOne`
- `getContentBlocks`
- `remove`
- `update`
- `updateContentBlocks`

### GeneratedDocumentsController

- `downloadPdf`
- `findAll`
- `findOne`
- `generate`
- `getContent`
- `remove`

---

## libs/modules/time-tracking

### TimeEntriesService

- `approveEntry`
- `bulkApprove`
- `bulkReject`
- `create`
- `discardTimer`
- `enforceEntryNotLocked`
- `enforceNoTimeOverlap`
- `enforceNoTimeOverlapWithLock`
- `ensureCanManageEntries`
- `findAll`
- `findOne`
- `getActiveTimer`
- `lockEntry`
- `rejectEntry`
- `remove`
- `sanitizeTimeEntryForLog`
- `startTimer`
- `stopTimer`
- `submitEntry`
- `unlockEntry`
- `update`
- `updateTimer`
- `validateClientOwnership`
- `validateSettlementOwnership`
- `validateTaskOwnership`

### TimesheetService

- `calculateSummary`
- `getClientReport`
- `getDailyTimesheet`
- `getReportSummary`
- `getWeeklyTimesheet`
- `groupEntries`
- `validateUserBelongsToCompany`

### TimeCalculationService

- `calculateDuration`
- `calculateTotalAmount`
- `checkOverlap`
- `formatDuration`
- `formatDurationHuman`
- `getDayBounds`
- `getEffectiveHourlyRate`
- `getMonthBounds`
- `getWeekBounds`
- `roundDuration`

### TimeSettingsService

- `allowsOverlapping`
- `clearCache`
- `getRoundingConfig`
- `getSettings`
- `requiresApproval`
- `updateSettings`

### TimeTrackingExportService

- `generateCsv`

### TimeTrackingPdfService

- `formatAmount`
- `formatMinutes`
- `generateTimeReportPdf`

### TimeTrackingExtendedStatsService

- `getEmployeeTimeBreakdown`
- `getTopSettlementsByTime`
- `getTopTasksByTime`

### TimeEntriesController

- `approve`
- `create`
- `discardTimer`
- `findAll`
- `findOne`
- `getActiveTimer`
- `lock`
- `reject`
- `remove`
- `startTimer`
- `stopTimer`
- `submit`
- `unlock`
- `update`
- `updateActiveTimer`

### TimeReportsController

- `exportReport`
- `generateExport`
- `getClientReport`
- `getDailyTimesheet`
- `getEmployeeBreakdown`
- `getReportSummary`
- `getTopSettlementsByTime`
- `getTopTasksByTime`
- `getWeeklyTimesheet`

### TimeSettingsController

- `getSettings`
- `updateSettings`

---

## libs/modules/email-client

### EmailClientService

- `deleteEmail`
- `getEmail`
- `getEmailAttachment`
- `getEmailConfigForUser`
- `getFolder`
- `getFolderPaginated`
- `getInbox`
- `getInboxPaginated`
- `listFolders`
- `markAsRead`
- `moveMessages`
- `searchEmails`
- `sendEmail`
- `updateFlags`
- `withTimeout`

### EmailDraftService

- `create`
- `findAiDrafts`
- `findAll`
- `findConflicts`
- `findMyDrafts`
- `findOne`
- `remove`
- `removeAll`
- `resolveConflict`
- `syncWithImap`
- `update`

### EmailDraftSyncService

- `composeDraftMime`
- `deleteAllDrafts`
- `deleteDraftWithSync`
- `findConflicts`
- `importDraftFromImap`
- `pushDraftToImap`
- `resolveConflict`
- `syncDrafts`
- `updateDraftWithSync`

### EmailAttachmentService

- `downloadAttachment`
- `getAbsolutePath`
- `uploadAttachment`

### EmailAiService

- `buildReplyPrompt`
- `buildSystemPrompt`
- `generateReplyDraft`
- `generateReplyDraftStream`
- `streamReplyDraft`

### EmailAutoReplyTemplateService

- `create`
- `findActiveByCompanyId`
- `findAll`
- `findOne`
- `incrementMatchCount`
- `matchesEmail`
- `remove`
- `update`

### EmailAutoReplyMatcherService

- `handleNewEmail`

### EmailIdleService

- `fetchLatestMessage`
- `onModuleDestroy`
- `startIdle`
- `stopIdle`

### EmailMessagesController

- `deleteEmails`
- `downloadAttachment`
- `getEmail`
- `getFolder`
- `getInbox`
- `listFolders`
- `markAsRead`
- `moveMessages`
- `searchEmails`
- `sendEmail`
- `updateFlags`

### EmailDraftsController

- `create`
- `findAiDrafts`
- `findAll`
- `findMyDrafts`
- `findOne`
- `generateAiReply`
- `generateAiReplyStream`
- `getConflicts`
- `remove`
- `removeAll`
- `resolveConflict`
- `sendDraft`
- `syncDrafts`
- `update`

### EmailAttachmentsController

- `downloadAttachment`
- `uploadAttachment`

### EmailAutoReplyTemplatesController

- `create`
- `findAll`
- `findOne`
- `remove`
- `testTemplate`
- `update`

---

## libs/modules/notifications

### NotificationService

- `archive`
- `archiveMultiple`
- `create`
- `createBatch`
- `delete`
- `findAll`
- `findArchived`
- `findOne`
- `findOneEntity`
- `getUnreadCount`
- `mapToResponseDto`
- `markAllAsRead`
- `markAsRead`
- `markAsUnread`
- `markEmailSent`
- `unarchiveNotification`

### NotificationDispatcherService

- `createInAppNotification`
- `dispatch`
- `dispatchToCompanyUsers`
- `isValidModuleSlug`
- `validateRecipients`

### NotificationSettingsService

- `batchCheckChannels`
- `checkEventTypeEnabled`
- `createDefaultSettings`
- `getAllSettingsForUser`
- `getRecipientsForNotification`
- `getSettingsForModule`
- `shouldSendEmail`
- `shouldSendForChannel`
- `shouldSendInApp`
- `updateAllSettingsForUser`
- `updateSettingsForModule`

### EmailChannelService

- `compileTemplate`
- `getDefaultTemplate`
- `handleEmailNotification`
- `resolveTemplatesDir`

### NotificationsController

- `archive`
- `archiveMultiple`
- `delete`
- `findAll`
- `findArchived`
- `findOne`
- `getUnreadCount`
- `markAllAsRead`
- `markAsRead`
- `markAsUnread`
- `restore`

### NotificationSettingsController

- `getAllSettings`
- `getModuleSettings`
- `updateGlobalSettings`
- `updateModuleSettings`

---

## libs/modules/ai-agent

### AIConversationService

- `create`
- `executeStreamingMessage`
- `findAll`
- `findOne`
- `remove`
- `sendMessage`
- `sendMessageStream`

### AIConfigurationService

- `clearApiKey`
- `create`
- `decryptApiKey`
- `encryptApiKey`
- `getConfiguration`
- `getDecryptedApiKey`
- `getDecryptedEmbeddingApiKey`
- `getEmbeddingConfig`
- `update`

### RAGService

- `buildRAGContext`
- `extractAndEmbedFile`
- `extractKeywords`
- `extractText`
- `findAllContexts`
- `findContext`
- `hasActiveDocuments`
- `removeContext`
- `searchContextByKeywords`

### TokenUsageService

- `getAllCompaniesUsage`
- `getCompanyMonthlyTotal`
- `getCompanyUsage`
- `getMyUsage`
- `getUserMonthlyTotal`
- `trackUsage`

### TokenLimitService

- `enforceTokenLimit`
- `findUserById`
- `getMyLimit`
- `setCompanyLimit`
- `setCompanyLimitWithUsage`
- `setUserLimit`
- `setUserLimitWithUsage`

### OpenAIProviderService

- `chat`
- `chatStream`
- `chatWithFallback`
- `cleanupStaleClients`
- `generateEmbedding`
- `getClient`
- `invalidateClient`
- `isReasoningModel`
- `isRetryableError`
- `mapToUserFriendlyError`
- `sleep`
- `validateApiKey`
- `withRetry`
- `withTimeout`

### OpenRouterProviderService

- `chat`
- `chatStream`
- `chatWithFallback`
- `generateEmbedding`
- `isReasoningModel`
- `isRetryableError`
- `mapToUserFriendlyError`
- `modelSupportsSystemRole`
- `safeStringify`
- `sleep`
- `transformMessagesForModel`
- `validateApiKey`
- `withRetry`

### OpenAIModelsService

- `clearCache`
- `fetchModelsFromAPI`
- `formatModelName`
- `getCacheKey`
- `getChatModels`
- `getDefaultChatModels`
- `getDefaultEmbeddingModels`
- `getEmbeddingModelDescription`
- `getEmbeddingModels`
- `getModelDescription`
- `isChatModel`
- `isEmbeddingModel`

### OpenRouterModelsService

- `clearCache`
- `extractProvider`
- `fetchModelsFromAPI`
- `getCacheKey`
- `getDefaultModels`
- `getModels`
- `transformModel`

### AIConversationController

- `createConversation`
- `findAllConversations`
- `findOneConversation`
- `getAllContext`
- `getContextFile`
- `removeContext`
- `removeConversation`
- `sendMessage`
- `sendMessageStream`
- `uploadContext`

### AIConfigurationController

- `create`
- `getConfiguration`
- `getModels`
- `getOpenAIEmbeddingModels`
- `getOpenAIModels`
- `resetApiKey`
- `update`

### TokenUsageController

- `getAllCompaniesUsage`
- `getCompanyUsage`
- `getMyLimits`
- `getMyUsage`
- `setCompanyLimit`
- `setTokenLimit`
- `setUserLimit`

---

## libs/auth

### AuthService

- `changePassword`
- `generateTokens`
- `login`
- `refreshToken`
- `register`
- `toUserDto`
- `validateUser`

### AuthController

- `changePassword`
- `getCurrentUser`
- `login`
- `refresh`
- `register`

---

## libs/rbac

### RBACService

- `canAccessModule`
- `clearModuleCache`
- `companyHasModule`
- `companyHasModuleById`
- `getAvailableModules`
- `getDefaultModulePermissions`
- `getDiscoveryStats`
- `getModuleBySlug`
- `getModulePermissions`
- `grantModuleAccess`
- `hasPermission`
- `invalidateModuleCache`
- `moduleExists`
- `revokeModuleAccess`

### ModuleDiscoveryService

- `discoverModules`
- `getAllModules`
- `getDefaultPermissions`
- `getDiscoveryStats`
- `getModuleBySlug`
- `getModuleDependencies`
- `getModulePermissions`
- `isDiscoveryComplete`
- `moduleExists`
- `onModuleInit`
- `reloadModules`
- `removeStaleModules`
- `syncWithDatabase`
- `validateModuleConfig`

---

## libs/email

### EmailSenderService

- `cleanupExpiredTransporters`
- `clearTransporters`
- `getConfigKey`
- `getOrCreateTransporter`
- `maskEmail`
- `sendBatchEmails`
- `sendBatchEmailsAndSave`
- `sendEmail`
- `sendEmailAndSave`
- `verifyConnection`

### EmailReaderService

- `appendToDrafts`
- `appendToMailbox`
- `createMailbox`
- `deleteDraftFromImap`
- `deleteEmails`
- `fetchDrafts`
- `fetchEmailAttachment`
- `fetchEmails`
- `fetchEmailsPaginated`
- `findDraftsMailbox`
- `findSentMailbox`
- `findTrashMailbox`
- `listMailboxes`
- `markAsSeen`
- `moveMessages`
- `processMessage`
- `searchEmails`
- `updateDraftInImap`
- `updateFlags`

### ImapMailboxService

- `appendToMailbox`
- `createMailbox`
- `findDraftsMailbox`
- `findSentMailbox`
- `listMailboxes`

### EmailAutodiscoveryService

- `clearCache`
- `discover`
- `escapeXml`
- `extractDomain`
- `isBlockedHostname`
- `isValidDomain`
- `isValidDomainFormat`
- `tryAutoconfig`
- `tryAutodiscover`
- `tryIspdb`
- `verifyConfig`

### EmailConfigurationController

- `autodiscover`
- `createCompanyConfig`
- `createUserConfig`
- `deleteCompanyConfig`
- `deleteUserConfig`
- `getCompanyConfig`
- `getUserConfig`
- `updateCompanyConfig`
- `updateUserConfig`

---

## libs/common

### EncryptionService

- `decrypt`
- `encrypt`
- `getKey`
- `getOrCreateDevKey`
- `isConfigured`
- `isEncryptedFormat`
- `onModuleInit`

### SystemCompanyService

- `getCompanyIdForUser`
- `getSystemCompany`
- `getSystemCompanyId`
- `initializeCache`
- `invalidateCache`
- `onModuleInit`

### TenantService

- `getEffectiveCompanyId`

---

## apps/api/src/admin

### AdminService

- `createCompany`
- `createUser`
- `findAllCompanies`
- `findAllUsers`
- `findAvailableOwners`
- `findCompanyById`
- `findUserById`
- `getCompanyEmployees`
- `getCompanyProfileById`
- `setUserActiveStatus`
- `softDeleteCompany`
- `softDeleteUser`
- `updateCompany`
- `updateCompanyProfileById`
- `updateUser`

### AdminController

- `activateUser`
- `createCompany`
- `createUser`
- `deleteCompany`
- `deleteUser`
- `findAllCompanies`
- `findAllUsers`
- `findAvailableOwners`
- `findCompanyById`
- `findUserById`
- `getCompanyEmployees`
- `getCompanyProfile`
- `updateCompany`
- `updateCompanyProfile`
- `updateUser`

---

## apps/api/src/company

### CompanyService

- `createEmployee`
- `getCompanyById`
- `getEmployeeById`
- `getEmployees`
- `getProfile`
- `sendUserCreatedNotification`
- `softDeleteEmployee`
- `updateEmployee`
- `updateProfile`

### CompanyController

- `createEmployee`
- `deleteEmployee`
- `getEmployeeById`
- `getEmployees`
- `getProfile`
- `updateEmployee`
- `updateProfile`

---

## apps/api/src/modules

### ModulesService

- `canUserAccess`
- `cleanupOrphanedPermissions`
- `create`
- `findAll`
- `findById`
- `getAvailableModules`
- `getCompanyModules`
- `getDefaultModulePermissions`
- `getDiscoveredModules`
- `getDiscoveryStats`
- `getEmployeeModules`
- `getModuleByIdentifier`
- `getModuleBySlug`
- `getModuleBySlugDirect`
- `getModulePermissions`
- `getModulesForUser`
- `grantModuleToCompany`
- `grantModuleToEmployee`
- `managePermission`
- `reloadModules`
- `revokeModuleFromCompany`
- `revokeModuleFromEmployee`
- `revokePermission`
- `softDeleteModule`
- `update`
- `updateEmployeeModulePermissions`

### ModulesController

- `cleanupOrphanedPermissions`
- `create`
- `delete`
- `getCompanyModules`
- `getDefaultModulePermissions`
- `getDiscoveredModules`
- `getDiscoveryStats`
- `getEmployeeModules`
- `getModuleByIdentifier`
- `getModulePermissions`
- `getModules`
- `managePermissions`
- `reloadModules`
- `revokePermissions`
- `update`
- `updatePermissions`

### EmployeeModulePermissionsService

- `getEmployeeModules`
- `getModuleBySlug`
- `grantModuleToEmployee`
- `grantModuleToEmployeeWithTransaction`
- `revokeModuleFromEmployee`
- `updateEmployeeModulePermissions`

### CompanyModuleAccessService

- `cleanupOrphanedPermissions`
- `getCompanyModules`
- `grantModuleToCompany`
- `revokeModuleFromCompany`

---

## apps/api/src/email-config

### EmailConfigService

- `createCompanyConfig`
- `createSystemAdminConfig`
- `createUserConfig`
- `deleteCompanyConfig`
- `deleteSystemAdminConfig`
- `deleteUserConfig`
- `getCompanyConfig`
- `getSystemAdminCompanyId`
- `getSystemAdminConfig`
- `getUserConfig`
- `updateCompanyConfig`
- `updateSystemAdminConfig`
- `updateUserConfig`

### EmailConfigController

- `checkCompanyInbox`
- `checkInbox`
- `checkSystemAdminInbox`
- `createCompanyEmailConfig`
- `createSystemAdminEmailConfig`
- `createUserEmailConfig`
- `deleteCompanyEmailConfig`
- `deleteSystemAdminEmailConfig`
- `deleteUserEmailConfig`
- `getCompanyEmailConfig`
- `getSystemAdminEmailConfig`
- `getUserEmailConfig`
- `sendCompanyEmail`
- `sendEmail`
- `sendSystemAdminEmail`
- `testCompanyImap`
- `testCompanySmtp`
- `testImap`
- `testSmtp`
- `testSystemAdminImap`
- `testSystemAdminSmtp`
- `updateCompanyEmailConfig`
- `updateSystemAdminEmailConfig`
- `updateUserEmailConfig`

### SmtpImapService

- `checkCompanyInbox`
- `checkInbox`
- `createImapFlowClient`
- `fetchFromImapInbox`
- `sanitizeEmailError`
- `sendCompanyEmail`
- `sendEmail`
- `testImapConnection`
- `testSmtpConnection`
