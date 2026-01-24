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
  getNotificationService,
  resetNotificationService,
} from './notification-service';

// ============================================================================
// Test Utilities - Only exported in non-production environments
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-require-imports
export const MockEmailProvider = process.env.NODE_ENV !== 'production'
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ? require('./email-provider').MockEmailProvider
  : undefined;

// eslint-disable-next-line @typescript-eslint/no-require-imports
export const createMockNotificationService = process.env.NODE_ENV !== 'production'
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ? require('./notification-service').createMockNotificationService
  : undefined;

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
