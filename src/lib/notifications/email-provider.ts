/**
 * CBAHI Email Notification System - Email Provider
 *
 * Email sending abstraction with support for Gmail SMTP and Microsoft Graph providers.
 */

import {
  EmailMessage,
  EmailSendResult,
  EmailProviderConfig,
  EmailProviderType,
  GmailSmtpConfig,
  MicrosoftGraphConfig,
} from './types';

// ============================================================================
// Email Provider Interface
// ============================================================================

/**
 * Interface for email providers
 */
export interface EmailProvider {
  /**
   * Send an email message
   */
  send(message: EmailMessage): Promise<EmailSendResult>;

  /**
   * Verify the provider connection/authentication
   */
  verify(): Promise<boolean>;

  /**
   * Get the provider type
   */
  getType(): EmailProviderType;

  /**
   * Get the sender address
   */
  getSenderAddress(): string;
}

// ============================================================================
// Gmail SMTP Provider
// ============================================================================

/**
 * Gmail SMTP email provider using nodemailer
 */
export class GmailSmtpProvider implements EmailProvider {
  private config: GmailSmtpConfig;
  private transporter: import('nodemailer').Transporter | null = null;

  constructor(config: GmailSmtpConfig) {
    this.config = config;
  }

  /**
   * Initialize the nodemailer transporter
   */
  private async getTransporter(): Promise<import('nodemailer').Transporter> {
    if (this.transporter) {
      return this.transporter;
    }

    // Dynamic import of nodemailer
    const nodemailer = await import('nodemailer');

    this.transporter = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: {
        user: this.config.auth.user,
        pass: this.config.auth.pass,
      },
      tls: {
        rejectUnauthorized: true,
      },
    });

    return this.transporter;
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    try {
      const transporter = await this.getTransporter();

      const mailOptions: import('nodemailer').SendMailOptions = {
        from: {
          name: this.config.from.name,
          address: this.config.from.address,
        },
        to: message.to.join(', '),
        cc: message.cc?.join(', '),
        bcc: message.bcc?.join(', '),
        replyTo: message.replyTo,
        subject: message.subject,
        html: message.htmlBody,
        text: message.textBody,
        attachments: message.attachments?.map((att) => ({
          filename: att.filename,
          content: att.content,
          contentType: att.contentType,
        })),
      };

      const result = await transporter.sendMail(mailOptions);

      return {
        success: true,
        messageId: result.messageId,
        timestamp: new Date(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Gmail SMTP send error:', errorMessage);

      return {
        success: false,
        error: errorMessage,
        timestamp: new Date(),
      };
    }
  }

  async verify(): Promise<boolean> {
    try {
      const transporter = await this.getTransporter();
      await transporter.verify();
      return true;
    } catch (error) {
      console.error('Gmail SMTP verification failed:', error);
      return false;
    }
  }

  getType(): EmailProviderType {
    return EmailProviderType.GMAIL_SMTP;
  }

  getSenderAddress(): string {
    return this.config.from.address;
  }
}

// ============================================================================
// Microsoft Graph Provider
// ============================================================================

/**
 * Microsoft Graph email provider
 */
export class MicrosoftGraphProvider implements EmailProvider {
  private config: MicrosoftGraphConfig;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(config: MicrosoftGraphConfig) {
    this.config = config;
  }

  /**
   * Get or refresh the access token
   */
  private async getAccessToken(): Promise<string> {
    // Check if we have a valid cached token
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      // Get token using client credentials flow
      const tokenUrl = `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/token`;

      const params = new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials',
      });

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Token request failed: ${errorData.error_description || response.statusText}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      // Set expiry to 5 minutes before actual expiry for safety
      this.tokenExpiry = new Date(Date.now() + (data.expires_in - 300) * 1000);

      return this.accessToken!;
    } catch (error) {
      console.error('Failed to get Microsoft Graph access token:', error);
      throw error;
    }
  }

  /**
   * Get initialized Microsoft Graph client
   */
  private async getGraphClient(): Promise<import('@microsoft/microsoft-graph-client').Client> {
    const { Client } = await import('@microsoft/microsoft-graph-client');
    const accessToken = await this.getAccessToken();

    return Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      },
    });
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    try {
      const client = await this.getGraphClient();

      // Build the email message for Microsoft Graph
      const graphMessage: Record<string, unknown> = {
        message: {
          subject: message.subject,
          body: {
            contentType: 'HTML',
            content: message.htmlBody,
          },
          toRecipients: message.to.map((email) => ({
            emailAddress: { address: email },
          })),
          ccRecipients: message.cc?.map((email) => ({
            emailAddress: { address: email },
          })),
          bccRecipients: message.bcc?.map((email) => ({
            emailAddress: { address: email },
          })),
          replyTo: message.replyTo
            ? [{ emailAddress: { address: message.replyTo } }]
            : undefined,
          attachments: message.attachments?.map((att) => ({
            '@odata.type': '#microsoft.graph.fileAttachment',
            name: att.filename,
            contentType: att.contentType,
            contentBytes: Buffer.isBuffer(att.content)
              ? att.content.toString('base64')
              : Buffer.from(att.content).toString('base64'),
          })),
        },
        saveToSentItems: true,
      };

      // Send the email using the user's mailbox
      await client
        .api(`/users/${this.config.from.address}/sendMail`)
        .post(graphMessage);

      return {
        success: true,
        messageId: `graph-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Microsoft Graph send error:', errorMessage);

      return {
        success: false,
        error: errorMessage,
        timestamp: new Date(),
      };
    }
  }

  async verify(): Promise<boolean> {
    try {
      const client = await this.getGraphClient();

      // Try to get the user's profile to verify authentication
      await client.api(`/users/${this.config.from.address}`).get();
      return true;
    } catch (error) {
      console.error('Microsoft Graph verification failed:', error);
      return false;
    }
  }

  getType(): EmailProviderType {
    return EmailProviderType.MICROSOFT_GRAPH;
  }

  getSenderAddress(): string {
    return this.config.from.address;
  }
}

// ============================================================================
// Mock Provider for Testing
// ============================================================================

/**
 * Mock email provider for testing purposes.
 *
 * WARNING: This class is for testing/development only and should NOT be used
 * in production environments. The index.ts conditionally exports this class
 * only when NODE_ENV !== 'production'.
 */
export class MockEmailProvider implements EmailProvider {
  private sentEmails: EmailMessage[] = [];
  private shouldFail: boolean = false;
  private senderAddress: string;

  constructor(senderAddress: string = 'test@cbahi.gov.sa') {
    this.senderAddress = senderAddress;
  }

  /**
   * Set whether sends should fail (for testing error handling)
   */
  setShouldFail(fail: boolean): void {
    this.shouldFail = fail;
  }

  /**
   * Get all sent emails (for testing assertions)
   */
  getSentEmails(): EmailMessage[] {
    return [...this.sentEmails];
  }

  /**
   * Clear sent emails
   */
  clearSentEmails(): void {
    this.sentEmails = [];
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    if (this.shouldFail) {
      return {
        success: false,
        error: 'Mock provider configured to fail',
        timestamp: new Date(),
      };
    }

    this.sentEmails.push({ ...message });

    return {
      success: true,
      messageId: `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };
  }

  async verify(): Promise<boolean> {
    return !this.shouldFail;
  }

  getType(): EmailProviderType {
    return EmailProviderType.GMAIL_SMTP; // Default type for mock
  }

  getSenderAddress(): string {
    return this.senderAddress;
  }
}

// ============================================================================
// Provider Factory
// ============================================================================

/**
 * Factory function to create the appropriate email provider based on configuration
 */
export function getEmailProvider(config: EmailProviderConfig): EmailProvider {
  switch (config.type) {
    case EmailProviderType.GMAIL_SMTP:
      return new GmailSmtpProvider(config as GmailSmtpConfig);

    case EmailProviderType.MICROSOFT_GRAPH:
      return new MicrosoftGraphProvider(config as MicrosoftGraphConfig);

    default:
      throw new Error(`Unsupported email provider type: ${(config as EmailProviderConfig).type}`);
  }
}

/**
 * Create a Gmail SMTP provider with configuration from environment variables
 */
export function createGmailProviderFromEnv(): GmailSmtpProvider {
  const config: GmailSmtpConfig = {
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
  };

  if (!config.auth.user || !config.auth.pass) {
    throw new Error('SMTP_USER and SMTP_PASS environment variables are required');
  }

  return new GmailSmtpProvider(config);
}

/**
 * Create a Microsoft Graph provider with configuration from environment variables
 */
export function createMicrosoftGraphProviderFromEnv(): MicrosoftGraphProvider {
  const config: MicrosoftGraphConfig = {
    type: EmailProviderType.MICROSOFT_GRAPH,
    clientId: process.env.AZURE_CLIENT_ID || '',
    clientSecret: process.env.AZURE_CLIENT_SECRET || '',
    tenantId: process.env.AZURE_TENANT_ID || '',
    from: {
      name: process.env.EMAIL_FROM_NAME || 'CBAHI Notifications',
      address: process.env.EMAIL_FROM_ADDRESS || '',
    },
  };

  if (!config.clientId || !config.clientSecret || !config.tenantId) {
    throw new Error('AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, and AZURE_TENANT_ID environment variables are required');
  }

  if (!config.from.address) {
    throw new Error('EMAIL_FROM_ADDRESS environment variable is required');
  }

  return new MicrosoftGraphProvider(config);
}

// ============================================================================
// Provider with Retry Logic
// ============================================================================

/**
 * Wrapper that adds retry logic to any email provider
 */
export class RetryableEmailProvider implements EmailProvider {
  private provider: EmailProvider;
  private maxRetries: number;
  private retryDelayMs: number;

  constructor(provider: EmailProvider, maxRetries: number = 3, retryDelayMs: number = 1000) {
    this.provider = provider;
    this.maxRetries = maxRetries;
    this.retryDelayMs = retryDelayMs;
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    let lastResult: EmailSendResult | null = null;
    let attempt = 0;

    while (attempt < this.maxRetries) {
      attempt++;

      const result = await this.provider.send(message);

      if (result.success) {
        return result;
      }

      lastResult = result;

      // Don't wait after the last attempt
      if (attempt < this.maxRetries) {
        // Exponential backoff
        const delay = this.retryDelayMs * Math.pow(2, attempt - 1);
        await this.sleep(delay);
      }
    }

    return lastResult || {
      success: false,
      error: 'Max retries exceeded',
      timestamp: new Date(),
    };
  }

  async verify(): Promise<boolean> {
    return this.provider.verify();
  }

  getType(): EmailProviderType {
    return this.provider.getType();
  }

  getSenderAddress(): string {
    return this.provider.getSenderAddress();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Provider with Rate Limiting
// ============================================================================

/**
 * Wrapper that adds rate limiting to any email provider
 */
export class RateLimitedEmailProvider implements EmailProvider {
  private provider: EmailProvider;
  private maxEmailsPerMinute: number;
  private sentTimestamps: number[] = [];

  constructor(provider: EmailProvider, maxEmailsPerMinute: number = 60) {
    this.provider = provider;
    this.maxEmailsPerMinute = maxEmailsPerMinute;
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    // Clean up old timestamps (older than 1 minute)
    const oneMinuteAgo = Date.now() - 60000;
    this.sentTimestamps = this.sentTimestamps.filter((ts) => ts > oneMinuteAgo);

    // Check if we've hit the rate limit
    if (this.sentTimestamps.length >= this.maxEmailsPerMinute) {
      return {
        success: false,
        error: `Rate limit exceeded: ${this.maxEmailsPerMinute} emails per minute`,
        timestamp: new Date(),
      };
    }

    // Send the email
    const result = await this.provider.send(message);

    if (result.success) {
      this.sentTimestamps.push(Date.now());
    }

    return result;
  }

  async verify(): Promise<boolean> {
    return this.provider.verify();
  }

  getType(): EmailProviderType {
    return this.provider.getType();
  }

  getSenderAddress(): string {
    return this.provider.getSenderAddress();
  }

  /**
   * Get the current rate (emails sent in the last minute)
   */
  getCurrentRate(): number {
    const oneMinuteAgo = Date.now() - 60000;
    return this.sentTimestamps.filter((ts) => ts > oneMinuteAgo).length;
  }
}

const emailProviders = {
  GmailSmtpProvider,
  MicrosoftGraphProvider,
  MockEmailProvider,
  RetryableEmailProvider,
  RateLimitedEmailProvider,
  getEmailProvider,
  createGmailProviderFromEnv,
  createMicrosoftGraphProviderFromEnv,
};

export default emailProviders;
