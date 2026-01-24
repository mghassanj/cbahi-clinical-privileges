/**
 * CBAHI Email Notification System
 *
 * A complete bilingual (Arabic/English) email notification system for
 * the CBAHI Privilege Management System.
 *
 * @module notifications
 */

// ============================================================================
// Types
// ============================================================================

export * from './types';

// ============================================================================
// Email Templates
// ============================================================================

export {
  defaultBrandConfig,
  emailTitles,
  statusLabels,
  urgencyLabels,
  categoryLabels,
  generateBaseEmailTemplate,
  generatePlainTextEmail,
  htmlComponents,
} from './email-templates';

// ============================================================================
// Email Generator
// ============================================================================

export {
  formatters,
  sectionGenerators,
  generateEmail,
  generateApprovalRequiredEmail,
  generateApprovalProgressEmail,
  generateApprovalCompleteEmail,
  generateRejectionEmail,
  generateModificationsRequestedEmail,
  generateEscalationEmail,
} from './email-generator';

export type { GenerateEmailParams } from './email-generator';

// ============================================================================
// Email Provider
// ============================================================================

export {
  GmailSmtpProvider,
  MicrosoftGraphProvider,
  MockEmailProvider,
  RetryableEmailProvider,
  RateLimitedEmailProvider,
  getEmailProvider,
  createGmailProviderFromEnv,
  createMicrosoftGraphProviderFromEnv,
} from './email-provider';

export type { EmailProvider } from './email-provider';

// ============================================================================
// Notification Service
// ============================================================================

export {
  NotificationService,
  createNotificationServiceFromEnv,
  createMockNotificationService,
  getNotificationService,
  resetNotificationService,
} from './notification-service';

// ============================================================================
// Escalation Service
// ============================================================================

export {
  EscalationService,
  InMemoryEscalationRepository,
  ScheduledEscalationRunner,
  createTestEscalationService,
  DEFAULT_ESCALATION_THRESHOLDS,
} from './escalation-service';

// ============================================================================
// Real-time Broadcast (SSE)
// ============================================================================

export {
  registerClient,
  unregisterClient,
  isUserConnected,
  getClientCount,
  getTotalClientCount,
  sendHeartbeat,
  broadcastToUser,
  broadcastToUsers,
  broadcastToAll,
  notifyApprovalRequired,
  notifyRequestApproved,
  notifyRequestRejected,
  notifyModificationsRequested,
  notifyEscalationWarning,
  clearPendingNotifications,
  getStats,
} from './broadcast';

export type {
  NotificationEventType,
  BroadcastNotification,
  SSEClient,
} from './broadcast';
