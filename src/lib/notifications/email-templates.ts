/**
 * CBAHI Email Notification System - Email Templates
 *
 * Brand configuration and HTML email templates for bilingual (Arabic/English) notifications.
 */

import {
  EmailBrandConfig,
  EmailTitles,
  NotificationType,
  BilingualText,
} from './types';

// ============================================================================
// Brand Configuration
// ============================================================================

export const defaultBrandConfig: EmailBrandConfig = {
  organizationNameEn: 'CBAHI - Central Board for Accreditation of Healthcare Institutions',
  organizationNameAr: 'المجلس المركزي لاعتماد المنشآت الصحية',
  logoUrl: 'https://cbahi.gov.sa/assets/images/logo.png',
  colors: {
    primary: '#1e40af',
    primaryDark: '#1e3a8a',
    success: '#166534',
    error: '#991b1b',
    warning: '#b45309',
    info: '#0369a1',
    textPrimary: '#1f2937',
    textSecondary: '#6b7280',
    background: '#ffffff',
    backgroundAlt: '#f9fafb',
    border: '#e5e7eb',
  },
  footerTextEn: 'This is an automated message from the CBAHI Privilege Management System. Please do not reply to this email.',
  footerTextAr: 'هذه رسالة آلية من نظام إدارة الصلاحيات في المجلس المركزي. الرجاء عدم الرد على هذا البريد الإلكتروني.',
};

// ============================================================================
// Email Titles (Bilingual)
// ============================================================================

export const emailTitles: EmailTitles = {
  [NotificationType.APPROVAL_REQUIRED]: {
    en: 'Action Required: Privilege Application Awaiting Your Approval',
    ar: 'إجراء مطلوب: طلب صلاحيات بانتظار موافقتك',
  },
  [NotificationType.APPROVAL_PROGRESS]: {
    en: 'Update: Your Privilege Application Has Progressed',
    ar: 'تحديث: تقدم طلب الصلاحيات الخاص بك',
  },
  [NotificationType.APPROVAL_COMPLETE]: {
    en: 'Congratulations: Your Privilege Application Has Been Approved',
    ar: 'تهانينا: تمت الموافقة على طلب الصلاحيات الخاص بك',
  },
  [NotificationType.REJECTION]: {
    en: 'Notice: Your Privilege Application Has Been Declined',
    ar: 'إشعار: تم رفض طلب الصلاحيات الخاص بك',
  },
  [NotificationType.MODIFICATIONS_REQUESTED]: {
    en: 'Action Required: Modifications Needed for Your Application',
    ar: 'إجراء مطلوب: تعديلات مطلوبة على طلبك',
  },
  [NotificationType.ESCALATION_REMINDER]: {
    en: 'Reminder: Pending Approval Request Requires Your Attention',
    ar: 'تذكير: طلب موافقة معلق يتطلب انتباهك',
  },
  [NotificationType.ESCALATION_MANAGER]: {
    en: 'Escalation Notice: Pending Approval Requires Management Attention',
    ar: 'إشعار تصعيد: موافقة معلقة تتطلب اهتمام الإدارة',
  },
  [NotificationType.ESCALATION_HR]: {
    en: 'Urgent Escalation: Critical Pending Approval - HR Action Required',
    ar: 'تصعيد عاجل: موافقة معلقة حرجة - إجراء الموارد البشرية مطلوب',
  },
};

// ============================================================================
// Status Labels (Bilingual)
// ============================================================================

export const statusLabels: Record<string, BilingualText> = {
  PENDING: { en: 'Pending', ar: 'قيد الانتظار' },
  IN_REVIEW: { en: 'In Review', ar: 'قيد المراجعة' },
  APPROVED: { en: 'Approved', ar: 'موافق عليه' },
  REJECTED: { en: 'Rejected', ar: 'مرفوض' },
  MODIFICATIONS_REQUIRED: { en: 'Modifications Required', ar: 'تعديلات مطلوبة' },
  CANCELLED: { en: 'Cancelled', ar: 'ملغي' },
};

export const urgencyLabels: Record<string, BilingualText> = {
  NORMAL: { en: 'Normal', ar: 'عادي' },
  HIGH: { en: 'High', ar: 'عالي' },
  URGENT: { en: 'Urgent', ar: 'عاجل' },
};

export const categoryLabels: Record<string, BilingualText> = {
  CLINICAL: { en: 'Clinical', ar: 'سريري' },
  SURGICAL: { en: 'Surgical', ar: 'جراحي' },
  DIAGNOSTIC: { en: 'Diagnostic', ar: 'تشخيصي' },
  ADMINISTRATIVE: { en: 'Administrative', ar: 'إداري' },
  CONSULTATION: { en: 'Consultation', ar: 'استشاري' },
};

// ============================================================================
// HTML Email Template Structure
// ============================================================================

export interface EmailTemplateParams {
  brand: EmailBrandConfig;
  titleEn: string;
  titleAr: string;
  contentSectionsAr: string[];
  contentSectionsEn: string[];
  footerActionsEn?: string;
  footerActionsAr?: string;
}

/**
 * Generates the base HTML email template with bilingual layout.
 * Arabic (RTL) section appears first, followed by English (LTR) section.
 */
export function generateBaseEmailTemplate(params: EmailTemplateParams): string {
  const { brand, titleEn, titleAr, contentSectionsAr, contentSectionsEn, footerActionsEn, footerActionsAr } = params;

  return `
<!DOCTYPE html>
<html lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${titleAr} | ${titleEn}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style type="text/css">
    /* Reset styles */
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table, td {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      height: auto;
      line-height: 100%;
      outline: none;
      text-decoration: none;
    }
    body {
      height: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      background-color: ${brand.colors.backgroundAlt};
    }
    /* Custom styles */
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: ${brand.colors.background};
    }
    .header {
      background-color: ${brand.colors.primary};
      padding: 24px;
      text-align: center;
    }
    .header-logo {
      max-width: 180px;
      height: auto;
    }
    .header-title {
      color: #ffffff;
      font-size: 14px;
      margin-top: 12px;
    }
    .content-section {
      padding: 24px;
    }
    .section-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 2px solid ${brand.colors.primary};
    }
    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
    }
    .info-table td {
      padding: 10px 12px;
      border-bottom: 1px solid ${brand.colors.border};
    }
    .info-table .label {
      font-weight: 600;
      color: ${brand.colors.textSecondary};
      width: 40%;
    }
    .info-table .value {
      color: ${brand.colors.textPrimary};
    }
    .cta-button {
      display: inline-block;
      padding: 14px 32px;
      background-color: ${brand.colors.primary};
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      font-size: 16px;
    }
    .cta-button:hover {
      background-color: ${brand.colors.primaryDark};
    }
    .warning-box {
      background-color: #fef3c7;
      border: 1px solid #f59e0b;
      border-radius: 6px;
      padding: 16px;
      margin: 16px 0;
    }
    .warning-box.error {
      background-color: #fee2e2;
      border-color: ${brand.colors.error};
    }
    .warning-box.success {
      background-color: #dcfce7;
      border-color: ${brand.colors.success};
    }
    .warning-box.info {
      background-color: #dbeafe;
      border-color: ${brand.colors.info};
    }
    .progress-bar {
      background-color: ${brand.colors.border};
      border-radius: 10px;
      height: 20px;
      overflow: hidden;
      margin: 16px 0;
    }
    .progress-fill {
      background-color: ${brand.colors.success};
      height: 100%;
      transition: width 0.3s ease;
    }
    .approval-step {
      display: flex;
      align-items: center;
      padding: 12px;
      border-bottom: 1px solid ${brand.colors.border};
    }
    .step-icon {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 12px;
      font-weight: 600;
    }
    .step-icon.completed {
      background-color: ${brand.colors.success};
      color: #ffffff;
    }
    .step-icon.current {
      background-color: ${brand.colors.primary};
      color: #ffffff;
    }
    .step-icon.pending {
      background-color: ${brand.colors.border};
      color: ${brand.colors.textSecondary};
    }
    .divider {
      border: 0;
      height: 1px;
      background-color: ${brand.colors.border};
      margin: 24px 0;
    }
    .footer {
      background-color: ${brand.colors.backgroundAlt};
      padding: 24px;
      text-align: center;
      font-size: 12px;
      color: ${brand.colors.textSecondary};
    }
    .lang-divider {
      background-color: ${brand.colors.primary};
      height: 4px;
      margin: 0;
    }
    /* RTL styles for Arabic */
    .rtl {
      direction: rtl;
      text-align: right;
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
    }
    .rtl .info-table .label {
      text-align: right;
    }
    .rtl .info-table .value {
      text-align: right;
    }
    .rtl .step-icon {
      margin-right: 0;
      margin-left: 12px;
    }
    /* LTR styles for English */
    .ltr {
      direction: ltr;
      text-align: left;
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
    }
    @media screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
      }
      .content-section {
        padding: 16px !important;
      }
      .info-table .label,
      .info-table .value {
        display: block;
        width: 100%;
      }
    }
  </style>
</head>
<body>
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: ${brand.colors.backgroundAlt};">
    <tr>
      <td align="center" style="padding: 24px 0;">
        <!-- Email Container -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" class="email-container" style="width: 100%; max-width: 600px; background-color: ${brand.colors.background}; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

          <!-- Header -->
          <tr>
            <td class="header">
              <img src="${brand.logoUrl}" alt="CBAHI Logo" class="header-logo" />
              <div class="header-title">
                <div style="margin-bottom: 4px;">${brand.organizationNameAr}</div>
                <div>${brand.organizationNameEn}</div>
              </div>
            </td>
          </tr>

          <!-- Arabic Section (RTL) -->
          <tr>
            <td class="content-section rtl">
              <h1 class="section-title" style="color: ${brand.colors.primary};">${titleAr}</h1>
              ${contentSectionsAr.join('\n')}
              ${footerActionsAr ? `
              <div style="text-align: center; margin-top: 24px;">
                ${footerActionsAr}
              </div>
              ` : ''}
            </td>
          </tr>

          <!-- Language Divider -->
          <tr>
            <td class="lang-divider"></td>
          </tr>

          <!-- English Section (LTR) -->
          <tr>
            <td class="content-section ltr">
              <h1 class="section-title" style="color: ${brand.colors.primary};">${titleEn}</h1>
              ${contentSectionsEn.join('\n')}
              ${footerActionsEn ? `
              <div style="text-align: center; margin-top: 24px;">
                ${footerActionsEn}
              </div>
              ` : ''}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="footer">
              <p class="rtl" style="margin-bottom: 8px;">${brand.footerTextAr}</p>
              <p class="ltr" style="margin-top: 8px;">${brand.footerTextEn}</p>
              <hr class="divider" />
              <p>
                &copy; ${new Date().getFullYear()} ${brand.organizationNameEn}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Generates plain text version of the email for clients that don't support HTML.
 */
export function generatePlainTextEmail(params: {
  titleEn: string;
  titleAr: string;
  contentAr: string;
  contentEn: string;
  footerTextAr: string;
  footerTextEn: string;
}): string {
  return `
${params.titleAr}
${'='.repeat(50)}

${params.contentAr}

${'─'.repeat(50)}

${params.titleEn}
${'='.repeat(50)}

${params.contentEn}

${'─'.repeat(50)}

${params.footerTextAr}
${params.footerTextEn}
  `.trim();
}

// ============================================================================
// HTML Component Templates
// ============================================================================

export const htmlComponents = {
  /**
   * Information table row
   */
  infoRow: (labelAr: string, labelEn: string, value: string, isRtl: boolean): string => {
    const label = isRtl ? labelAr : labelEn;
    return `
      <tr>
        <td class="label">${label}</td>
        <td class="value">${value}</td>
      </tr>
    `;
  },

  /**
   * Information table wrapper
   */
  infoTable: (rows: string[]): string => `
    <table class="info-table">
      ${rows.join('\n')}
    </table>
  `,

  /**
   * Call-to-action button
   */
  ctaButton: (textAr: string, textEn: string, url: string, isRtl: boolean): string => {
    const text = isRtl ? textAr : textEn;
    return `<a href="${url}" class="cta-button">${text}</a>`;
  },

  /**
   * Warning/info box
   */
  alertBox: (
    contentAr: string,
    contentEn: string,
    type: 'warning' | 'error' | 'success' | 'info',
    isRtl: boolean
  ): string => {
    const content = isRtl ? contentAr : contentEn;
    const typeClass = type === 'warning' ? '' : type;
    return `
      <div class="warning-box ${typeClass}">
        ${content}
      </div>
    `;
  },

  /**
   * Progress bar
   */
  progressBar: (completed: number, total: number): string => {
    const percentage = Math.round((completed / total) * 100);
    return `
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${percentage}%;"></div>
      </div>
    `;
  },

  /**
   * Approval chain step
   */
  approvalStep: (
    stepNumber: number,
    nameAr: string,
    nameEn: string,
    roleAr: string,
    roleEn: string,
    status: 'completed' | 'current' | 'pending',
    isRtl: boolean
  ): string => {
    const name = isRtl ? nameAr : nameEn;
    const role = isRtl ? roleAr : roleEn;
    const icon = status === 'completed' ? '✓' : stepNumber.toString();
    return `
      <div class="approval-step">
        <div class="step-icon ${status}">${icon}</div>
        <div>
          <div style="font-weight: 600;">${name}</div>
          <div style="font-size: 14px; color: #6b7280;">${role}</div>
        </div>
      </div>
    `;
  },

  /**
   * Privilege item
   */
  privilegeItem: (
    nameAr: string,
    nameEn: string,
    categoryAr: string,
    categoryEn: string,
    isRtl: boolean
  ): string => {
    const name = isRtl ? nameAr : nameEn;
    const category = isRtl ? categoryAr : categoryEn;
    return `
      <li style="margin-bottom: 8px;">
        <strong>${name}</strong>
        <span style="color: #6b7280; font-size: 14px;"> (${category})</span>
      </li>
    `;
  },

  /**
   * Section heading
   */
  sectionHeading: (textAr: string, textEn: string, isRtl: boolean): string => {
    const text = isRtl ? textAr : textEn;
    return `<h3 style="font-size: 16px; font-weight: 600; margin: 16px 0 8px 0; color: #374151;">${text}</h3>`;
  },

  /**
   * Text paragraph
   */
  paragraph: (textAr: string, textEn: string, isRtl: boolean): string => {
    const text = isRtl ? textAr : textEn;
    return `<p style="margin: 8px 0; line-height: 1.6; color: #4b5563;">${text}</p>`;
  },

  /**
   * Greeting
   */
  greeting: (nameAr: string, nameEn: string, isRtl: boolean): string => {
    const name = isRtl ? nameAr : nameEn;
    const greeting = isRtl ? 'السيد/السيدة' : 'Dear';
    return `<p style="font-size: 16px; margin-bottom: 16px;"><strong>${greeting} ${name},</strong></p>`;
  },
};

export default {
  defaultBrandConfig,
  emailTitles,
  statusLabels,
  urgencyLabels,
  categoryLabels,
  generateBaseEmailTemplate,
  generatePlainTextEmail,
  htmlComponents,
};
