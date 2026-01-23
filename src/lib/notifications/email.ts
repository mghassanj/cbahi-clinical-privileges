import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

// ============================================================================
// Types
// ============================================================================

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  content?: Buffer | string;
  path?: string;
  contentType?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ============================================================================
// Email Service
// ============================================================================

class EmailService {
  private transporter: Transporter | null = null;

  /**
   * Initialize the email transporter
   */
  private async getTransporter(): Promise<Transporter> {
    if (this.transporter) {
      return this.transporter;
    }

    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || "587", 10);
    const secure = process.env.SMTP_SECURE === "true";
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;

    if (!host || !user || !pass) {
      throw new Error("SMTP configuration is incomplete");
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });

    // Verify connection
    await this.transporter.verify();

    return this.transporter;
  }

  /**
   * Send an email
   */
  async send(options: EmailOptions): Promise<EmailResult> {
    try {
      const transporter = await this.getTransporter();
      const fromEmail = process.env.EMAIL_FROM || process.env.SMTP_USER;

      const result = await transporter.sendMail({
        from: fromEmail,
        to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
        cc: options.cc
          ? Array.isArray(options.cc)
            ? options.cc.join(", ")
            : options.cc
          : undefined,
        bcc: options.bcc
          ? Array.isArray(options.bcc)
            ? options.bcc.join(", ")
            : options.bcc
          : undefined,
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments: options.attachments,
      });

      return {
        success: true,
        messageId: result.messageId,
      };
    } catch (error) {
      console.error("Email send error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Send a test email
   */
  async sendTestEmail(to: string): Promise<EmailResult> {
    return this.send({
      to,
      subject: "CBAHI Email Test",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1e40af;">CBAHI Email Test</h1>
          <p>This is a test email from the CBAHI Clinical Privileges Management System.</p>
          <p>If you received this email, your email configuration is working correctly.</p>
          <hr style="border: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="color: #6b7280; font-size: 12px;">
            This is an automated message. Please do not reply.
          </p>
        </div>
      `,
      text: "This is a test email from the CBAHI Clinical Privileges Management System.",
    });
  }
}

// Export singleton instance
export const emailService = new EmailService();
