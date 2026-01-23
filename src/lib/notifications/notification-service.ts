/**
 * CBAHI Email Notification System - Notification Service
 *
 * Main orchestrator for sending notification emails.
 */

import {
  PrivilegeApplicationRequest,
  EmailMessage,
  EmailSendResult,
  NotificationServiceConfig,
  NotificationRecipient,
  ApprovalProgressInfo,
  RejectionInfo,
  ModificationInfo,
  EscalationInfo,
  EscalationLevel,
  EmailProviderType,
  Approver,
  User,
} from './types';

import {
  generateApprovalRequiredEmail,
  generateApprovalProgressEmail,
  generateApprovalCompleteEmail,
  generateRejectionEmail,
  generateModificationsRequestedEmail,
  generateEscalationEmail,
} from './email-generator';

import {
  EmailProvider,
  getEmailProvider,
  MockEmailProvider,
  RetryableEmailProvider,
} from './email-provider';

import { defaultBrandConfig } from './email-templates';

// ============================================================================
// Notification Service Class
// ============================================================================

/**
 * Main notification service that orchestrates sending all types of notifications
 */
export class NotificationService {
  private provider: EmailProvider;
  private config: NotificationServiceConfig;
  private testingMode: boolean = false;
  private testingEmail: string | null = null;

  constructor(config: NotificationServiceConfig) {
    this.config = config;

    // Create the email provider
    const baseProvider = getEmailProvider(config.emailProvider);

    // Wrap with retry logic
    this.provider = new RetryableEmailProvider(baseProvider, 3, 1000);

    // Set testing mode if configured
    if (config.testingMode) {
      this.testingMode = true;
      this.testingEmail = config.testingEmail || null;
    }
  }

  /**
   * Enable or disable testing mode
   * In testing mode, all emails are sent to the test email address
   */
  setTestingMode(enabled: boolean, testEmail?: string): void {
    this.testingMode = enabled;
    this.testingEmail = testEmail || null;

    if (enabled) {
      console.log(`[NotificationService] Testing mode enabled. All emails will be sent to: ${testEmail || 'console only'}`);
    } else {
      console.log('[NotificationService] Testing mode disabled. Emails will be sent to actual recipients.');
    }
  }

  /**
   * Get the action URL for a request
   */
  private getActionUrl(request: PrivilegeApplicationRequest, action?: string): string {
    const baseUrl = this.config.baseUrl.replace(/\/$/, '');
    const actionPath = action ? `/${action}` : '';
    return `${baseUrl}/requests/${request.id}${actionPath}`;
  }

  /**
   * Convert a User or Approver to a NotificationRecipient
   */
  private toRecipient(user: User | Approver): NotificationRecipient {
    return {
      email: user.email,
      nameEn: user.nameEn,
      nameAr: user.nameAr,
    };
  }

  /**
   * Send an email (respecting testing mode)
   */
  private async sendEmail(
    recipients: string[],
    subject: string,
    htmlBody: string,
    textBody: string,
    cc?: string[]
  ): Promise<EmailSendResult> {
    // In testing mode, redirect all emails to the test address
    let finalRecipients = recipients;
    let finalCc = cc;

    if (this.testingMode) {
      if (this.testingEmail) {
        finalRecipients = [this.testingEmail];
        finalCc = undefined;

        // Add original recipient info to subject
        subject = `[TEST - Original: ${recipients.join(', ')}] ${subject}`;
      } else {
        // Console-only mode
        console.log('\n========== EMAIL NOTIFICATION (TEST MODE) ==========');
        console.log(`To: ${recipients.join(', ')}`);
        if (cc) console.log(`CC: ${cc.join(', ')}`);
        console.log(`Subject: ${subject}`);
        console.log('--- Text Body ---');
        console.log(textBody);
        console.log('=================================================\n');

        return {
          success: true,
          messageId: `test-${Date.now()}`,
          timestamp: new Date(),
        };
      }
    }

    const message: EmailMessage = {
      to: finalRecipients,
      cc: finalCc,
      subject,
      htmlBody,
      textBody,
    };

    return this.provider.send(message);
  }

  // ============================================================================
  // Notification Methods
  // ============================================================================

  /**
   * Notify an approver that they have a new request to review
   */
  async notifyApprover(request: PrivilegeApplicationRequest): Promise<EmailSendResult> {
    const currentApprover = request.currentApprover;

    if (!currentApprover) {
      return {
        success: false,
        error: 'No current approver found for the request',
        timestamp: new Date(),
      };
    }

    const recipient = this.toRecipient(currentApprover);
    const actionUrl = this.getActionUrl(request, 'review');

    const emailContent = generateApprovalRequiredEmail({
      request,
      recipient,
      actionUrl,
      brand: defaultBrandConfig,
    });

    console.log(`[NotificationService] Sending approval request notification to ${currentApprover.email} for request ${request.requestNumber}`);

    return this.sendEmail(
      [currentApprover.email],
      emailContent.subject,
      emailContent.htmlBody,
      emailContent.textBody
    );
  }

  /**
   * Notify the applicant about approval progress
   */
  async notifyApprovalProgress(
    request: PrivilegeApplicationRequest,
    progressInfo: ApprovalProgressInfo
  ): Promise<EmailSendResult> {
    const recipient = this.toRecipient(request.applicant);
    const actionUrl = this.getActionUrl(request);

    const emailContent = generateApprovalProgressEmail({
      request,
      recipient,
      actionUrl,
      progressInfo,
      brand: defaultBrandConfig,
    });

    console.log(`[NotificationService] Sending approval progress notification to ${request.applicant.email} for request ${request.requestNumber}`);

    return this.sendEmail(
      [request.applicant.email],
      emailContent.subject,
      emailContent.htmlBody,
      emailContent.textBody
    );
  }

  /**
   * Notify the applicant that their request has been fully approved
   */
  async notifyApprovalComplete(request: PrivilegeApplicationRequest): Promise<EmailSendResult> {
    const recipient = this.toRecipient(request.applicant);
    const actionUrl = this.getActionUrl(request, 'privileges');

    const emailContent = generateApprovalCompleteEmail({
      request,
      recipient,
      actionUrl,
      brand: defaultBrandConfig,
    });

    console.log(`[NotificationService] Sending approval complete notification to ${request.applicant.email} for request ${request.requestNumber}`);

    return this.sendEmail(
      [request.applicant.email],
      emailContent.subject,
      emailContent.htmlBody,
      emailContent.textBody
    );
  }

  /**
   * Notify the applicant that their request has been rejected
   */
  async notifyRejection(
    request: PrivilegeApplicationRequest,
    reason: string,
    reasonAr?: string,
    canResubmit: boolean = true
  ): Promise<EmailSendResult> {
    const currentStep = request.approvalChain.steps[request.approvalChain.currentStep];

    if (!currentStep) {
      return {
        success: false,
        error: 'No current approval step found',
        timestamp: new Date(),
      };
    }

    const recipient = this.toRecipient(request.applicant);
    const actionUrl = this.getActionUrl(request, canResubmit ? 'edit' : undefined);

    const rejectionInfo: RejectionInfo = {
      rejectedBy: currentStep.approver,
      reason,
      reasonAr,
      rejectedAt: new Date(),
      canResubmit,
    };

    const emailContent = generateRejectionEmail({
      request,
      recipient,
      actionUrl,
      rejectionInfo,
      brand: defaultBrandConfig,
    });

    console.log(`[NotificationService] Sending rejection notification to ${request.applicant.email} for request ${request.requestNumber}`);

    return this.sendEmail(
      [request.applicant.email],
      emailContent.subject,
      emailContent.htmlBody,
      emailContent.textBody
    );
  }

  /**
   * Notify the applicant that modifications are required
   */
  async notifyModificationsRequested(
    request: PrivilegeApplicationRequest,
    comments: string,
    commentsAr?: string,
    specificChanges?: string[],
    specificChangesAr?: string[],
    deadline?: Date
  ): Promise<EmailSendResult> {
    const currentStep = request.approvalChain.steps[request.approvalChain.currentStep];

    if (!currentStep) {
      return {
        success: false,
        error: 'No current approval step found',
        timestamp: new Date(),
      };
    }

    const recipient = this.toRecipient(request.applicant);
    const actionUrl = this.getActionUrl(request, 'edit');

    const modificationInfo: ModificationInfo = {
      requestedBy: currentStep.approver,
      comments,
      commentsAr,
      specificChanges,
      specificChangesAr,
      deadline,
    };

    const emailContent = generateModificationsRequestedEmail({
      request,
      recipient,
      actionUrl,
      modificationInfo,
      brand: defaultBrandConfig,
    });

    console.log(`[NotificationService] Sending modifications requested notification to ${request.applicant.email} for request ${request.requestNumber}`);

    return this.sendEmail(
      [request.applicant.email],
      emailContent.subject,
      emailContent.htmlBody,
      emailContent.textBody
    );
  }

  /**
   * Send escalation notification
   */
  async notifyEscalation(
    level: EscalationLevel,
    request: PrivilegeApplicationRequest,
    escalationInfo: EscalationInfo
  ): Promise<EmailSendResult> {
    const recipient = this.toRecipient(escalationInfo.escalatedTo);
    const actionUrl = this.getActionUrl(request, 'review');

    const emailContent = generateEscalationEmail({
      request,
      recipient,
      actionUrl,
      escalationInfo,
      brand: defaultBrandConfig,
    });

    // Determine CC recipients based on escalation level
    let ccRecipients: string[] = [];
    if (level === EscalationLevel.MANAGER) {
      // CC the original approver
      ccRecipients = [escalationInfo.originalApprover.email];
    } else if (level === EscalationLevel.HR) {
      // CC both the original approver and their manager
      ccRecipients = [
        escalationInfo.originalApprover.email,
        // Note: In a real implementation, you'd also include the manager's email
      ];
    }

    console.log(`[NotificationService] Sending escalation (Level ${level}) notification to ${escalationInfo.escalatedTo.email} for request ${request.requestNumber}`);

    return this.sendEmail(
      [escalationInfo.escalatedTo.email],
      emailContent.subject,
      emailContent.htmlBody,
      emailContent.textBody,
      ccRecipients.length > 0 ? ccRecipients : undefined
    );
  }

  // ============================================================================
  // Batch Notification Methods
  // ============================================================================

  /**
   * Send notifications to all stakeholders after an approval
   */
  async notifyAllOnApproval(
    request: PrivilegeApplicationRequest,
    approver: Approver,
    isComplete: boolean
  ): Promise<{ applicantResult: EmailSendResult; approverResult?: EmailSendResult }> {
    const results: { applicantResult: EmailSendResult; approverResult?: EmailSendResult } = {
      applicantResult: { success: false, error: 'Not sent', timestamp: new Date() },
    };

    if (isComplete) {
      // Send approval complete notification to applicant
      results.applicantResult = await this.notifyApprovalComplete(request);
    } else {
      // Send progress notification to applicant
      const progressInfo: ApprovalProgressInfo = {
        completedSteps: request.approvalChain.steps.filter(
          (s) => s.status === 'APPROVED' || s.status === 'SKIPPED'
        ).length,
        totalSteps: request.approvalChain.totalSteps,
        latestApprover: approver,
        latestAction: 'APPROVED',
      };

      results.applicantResult = await this.notifyApprovalProgress(request, progressInfo);

      // Notify the next approver
      if (request.currentApprover) {
        results.approverResult = await this.notifyApprover(request);
      }
    }

    return results;
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Verify the email provider connection
   */
  async verifyConnection(): Promise<boolean> {
    return this.provider.verify();
  }

  /**
   * Get the provider type
   */
  getProviderType(): string {
    return this.provider.getType();
  }

  /**
   * Get the sender address
   */
  getSenderAddress(): string {
    return this.provider.getSenderAddress();
  }

  /**
   * Get the support email address
   */
  getSupportEmail(): string {
    return this.config.supportEmail;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a notification service from environment variables
 */
export function createNotificationServiceFromEnv(): NotificationService {
  const providerType = process.env.EMAIL_PROVIDER_TYPE || 'GMAIL_SMTP';

  let config: NotificationServiceConfig;

  if (providerType === EmailProviderType.MICROSOFT_GRAPH) {
    config = {
      emailProvider: {
        type: EmailProviderType.MICROSOFT_GRAPH,
        clientId: process.env.AZURE_CLIENT_ID || '',
        clientSecret: process.env.AZURE_CLIENT_SECRET || '',
        tenantId: process.env.AZURE_TENANT_ID || '',
        from: {
          name: process.env.EMAIL_FROM_NAME || 'CBAHI Notifications',
          address: process.env.EMAIL_FROM_ADDRESS || '',
        },
      },
      baseUrl: process.env.APP_BASE_URL || 'https://cbahi.gov.sa',
      supportEmail: process.env.SUPPORT_EMAIL || 'support@cbahi.gov.sa',
      testingMode: process.env.EMAIL_TESTING_MODE === 'true',
      testingEmail: process.env.EMAIL_TESTING_ADDRESS,
    };
  } else {
    config = {
      emailProvider: {
        type: EmailProviderType.GMAIL_SMTP,
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASS || '',
        },
        from: {
          name: process.env.SMTP_FROM_NAME || 'CBAHI Notifications',
          address: process.env.SMTP_FROM_ADDRESS || process.env.SMTP_USER || '',
        },
      },
      baseUrl: process.env.APP_BASE_URL || 'https://cbahi.gov.sa',
      supportEmail: process.env.SUPPORT_EMAIL || 'support@cbahi.gov.sa',
      testingMode: process.env.EMAIL_TESTING_MODE === 'true',
      testingEmail: process.env.EMAIL_TESTING_ADDRESS,
    };
  }

  return new NotificationService(config);
}

/**
 * Create a notification service with a mock provider for testing
 */
export function createMockNotificationService(baseUrl: string = 'https://test.cbahi.gov.sa'): {
  service: NotificationService;
  mockProvider: MockEmailProvider;
} {
  const mockProvider = new MockEmailProvider('noreply@cbahi.gov.sa');

  // Create a service with console-only testing mode
  const config: NotificationServiceConfig = {
    emailProvider: {
      type: EmailProviderType.GMAIL_SMTP,
      host: 'localhost',
      port: 587,
      secure: false,
      auth: { user: 'test', pass: 'test' },
      from: { name: 'Test', address: 'test@cbahi.gov.sa' },
    },
    baseUrl,
    supportEmail: 'support@cbahi.gov.sa',
    testingMode: true,
  };

  const service = new NotificationService(config);

  return { service, mockProvider };
}

// ============================================================================
// Singleton Instance
// ============================================================================

let notificationServiceInstance: NotificationService | null = null;

/**
 * Get or create the singleton notification service instance
 */
export function getNotificationService(): NotificationService {
  if (!notificationServiceInstance) {
    notificationServiceInstance = createNotificationServiceFromEnv();
  }
  return notificationServiceInstance;
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetNotificationService(): void {
  notificationServiceInstance = null;
}

export default {
  NotificationService,
  createNotificationServiceFromEnv,
  createMockNotificationService,
  getNotificationService,
  resetNotificationService,
};
