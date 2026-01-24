/**
 * CBAHI Email Notification System - Email Generator
 *
 * Bilingual email content generator with formatters and section generators.
 */

import {
  PrivilegeApplicationRequest,
  NotificationType,
  EmailContent,
  ApprovalProgressInfo,
  RejectionInfo,
  ModificationInfo,
  EscalationInfo,
  NotificationRecipient,
  EmailBrandConfig,
  ApprovalStep,
  Privilege,
  EscalationLevel,
} from './types';

import {
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
// Formatters
// ============================================================================

export const formatters = {
  /**
   * Format text with bilingual support
   */
  text: (textEn: string, textAr: string, isRtl: boolean): string => {
    return isRtl ? textAr : textEn;
  },

  /**
   * Format date in locale-appropriate format
   */
  date: (date: Date, isRtl: boolean): string => {
    const locale = isRtl ? 'ar-SA' : 'en-US';
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  },

  /**
   * Format datetime with time component
   */
  datetime: (date: Date, isRtl: boolean): string => {
    const locale = isRtl ? 'ar-SA' : 'en-US';
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  },

  /**
   * Format currency in SAR
   */
  currency: (amount: number, isRtl: boolean): string => {
    const locale = isRtl ? 'ar-SA' : 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'SAR',
    }).format(amount);
  },

  /**
   * Format number
   */
  number: (num: number, isRtl: boolean): string => {
    const locale = isRtl ? 'ar-SA' : 'en-US';
    return new Intl.NumberFormat(locale).format(num);
  },

  /**
   * Format duration in hours
   */
  duration: (hours: number, isRtl: boolean): string => {
    if (hours < 24) {
      return isRtl ? `${hours} ساعة` : `${hours} hours`;
    }
    const days = Math.floor(hours / 24);
    return isRtl ? `${days} يوم` : `${days} days`;
  },

  /**
   * Get status label
   */
  status: (status: string, isRtl: boolean): string => {
    const label = statusLabels[status];
    return label ? (isRtl ? label.ar : label.en) : status;
  },

  /**
   * Get urgency label
   */
  urgency: (urgency: string, isRtl: boolean): string => {
    const label = urgencyLabels[urgency];
    return label ? (isRtl ? label.ar : label.en) : urgency;
  },

  /**
   * Get category label
   */
  category: (category: string, isRtl: boolean): string => {
    const label = categoryLabels[category];
    return label ? (isRtl ? label.ar : label.en) : category;
  },
};

// ============================================================================
// Section Generators
// ============================================================================

export const sectionGenerators = {
  /**
   * Generate greeting header
   */
  header: (recipient: NotificationRecipient, isRtl: boolean): string => {
    return htmlComponents.greeting(recipient.nameAr, recipient.nameEn, isRtl);
  },

  /**
   * Generate request information section
   */
  requestInfo: (request: PrivilegeApplicationRequest, isRtl: boolean): string => {
    const rows = [
      htmlComponents.infoRow(
        'رقم الطلب',
        'Request Number',
        request.requestNumber,
        isRtl
      ),
      htmlComponents.infoRow(
        'تاريخ التقديم',
        'Submission Date',
        formatters.date(request.submittedAt, isRtl),
        isRtl
      ),
      htmlComponents.infoRow(
        'الحالة',
        'Status',
        formatters.status(request.status, isRtl),
        isRtl
      ),
    ];

    if (request.urgency && request.urgency !== 'NORMAL') {
      rows.push(
        htmlComponents.infoRow(
          'الأولوية',
          'Priority',
          `<span style="color: ${request.urgency === 'URGENT' ? '#991b1b' : '#b45309'}; font-weight: 600;">${formatters.urgency(request.urgency, isRtl)}</span>`,
          isRtl
        )
      );
    }

    const heading = htmlComponents.sectionHeading('معلومات الطلب', 'Request Information', isRtl);
    return heading + htmlComponents.infoTable(rows);
  },

  /**
   * Generate applicant details section
   */
  applicantDetails: (request: PrivilegeApplicationRequest, isRtl: boolean): string => {
    const { applicant } = request;
    const rows = [
      htmlComponents.infoRow(
        'الاسم',
        'Name',
        isRtl ? applicant.nameAr : applicant.nameEn,
        isRtl
      ),
      htmlComponents.infoRow(
        'الرقم الوظيفي',
        'Employee ID',
        applicant.employeeId,
        isRtl
      ),
      htmlComponents.infoRow(
        'البريد الإلكتروني',
        'Email',
        applicant.email,
        isRtl
      ),
    ];

    if (applicant.department) {
      rows.push(
        htmlComponents.infoRow(
          'القسم',
          'Department',
          isRtl ? (applicant.departmentAr || applicant.department) : applicant.department,
          isRtl
        )
      );
    }

    if (applicant.specialty) {
      rows.push(
        htmlComponents.infoRow(
          'التخصص',
          'Specialty',
          isRtl ? (applicant.specialtyAr || applicant.specialty) : applicant.specialty,
          isRtl
        )
      );
    }

    if (applicant.licenseNumber) {
      rows.push(
        htmlComponents.infoRow(
          'رقم الترخيص',
          'License Number',
          applicant.licenseNumber,
          isRtl
        )
      );
    }

    const heading = htmlComponents.sectionHeading('معلومات مقدم الطلب', 'Applicant Details', isRtl);
    return heading + htmlComponents.infoTable(rows);
  },

  /**
   * Generate privileges summary section
   */
  privilegesSummary: (privileges: Privilege[], isRtl: boolean): string => {
    const heading = htmlComponents.sectionHeading(
      'الصلاحيات المطلوبة',
      'Requested Privileges',
      isRtl
    );

    const privilegeItems = privileges.map((p) =>
      htmlComponents.privilegeItem(
        p.nameAr,
        p.nameEn,
        formatters.category(p.category, true),
        formatters.category(p.category, false),
        isRtl
      )
    );

    return `
      ${heading}
      <ul style="margin: 0; padding: ${isRtl ? '0 20px 0 0' : '0 0 0 20px'};">
        ${privilegeItems.join('\n')}
      </ul>
    `;
  },

  /**
   * Generate approval chain section
   */
  approvalChain: (steps: ApprovalStep[], currentStep: number, isRtl: boolean): string => {
    const heading = htmlComponents.sectionHeading('سلسلة الموافقات', 'Approval Chain', isRtl);

    const stepItems = steps.map((step, index) => {
      let status: 'completed' | 'current' | 'pending';
      if (step.status === 'APPROVED' || step.status === 'SKIPPED') {
        status = 'completed';
      } else if (index === currentStep) {
        status = 'current';
      } else {
        status = 'pending';
      }

      return htmlComponents.approvalStep(
        index + 1,
        step.approver.nameAr,
        step.approver.nameEn,
        step.approver.roleAr,
        step.approver.role,
        status,
        isRtl
      );
    });

    const progressBar = htmlComponents.progressBar(
      steps.filter((s) => s.status === 'APPROVED' || s.status === 'SKIPPED').length,
      steps.length
    );

    return `
      ${heading}
      ${progressBar}
      <div style="border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;">
        ${stepItems.join('\n')}
      </div>
    `;
  },

  /**
   * Generate warning/alert box
   */
  warningBox: (
    messageAr: string,
    messageEn: string,
    type: 'warning' | 'error' | 'success' | 'info',
    isRtl: boolean
  ): string => {
    return htmlComponents.alertBox(messageAr, messageEn, type, isRtl);
  },

  /**
   * Generate CTA button
   */
  ctaButton: (textAr: string, textEn: string, url: string, isRtl: boolean): string => {
    return htmlComponents.ctaButton(textAr, textEn, url, isRtl);
  },

  /**
   * Generate paragraph
   */
  paragraph: (textAr: string, textEn: string, isRtl: boolean): string => {
    return htmlComponents.paragraph(textAr, textEn, isRtl);
  },
};

// ============================================================================
// Email Generators by Type
// ============================================================================

interface GenerateEmailOptions {
  request: PrivilegeApplicationRequest;
  recipient: NotificationRecipient;
  actionUrl: string;
  brand?: EmailBrandConfig;
}

/**
 * Generate approval required email
 */
export function generateApprovalRequiredEmail(options: GenerateEmailOptions): EmailContent {
  const { request, recipient, actionUrl, brand = defaultBrandConfig } = options;
  const titles = emailTitles[NotificationType.APPROVAL_REQUIRED];

  const generateContent = (isRtl: boolean): string[] => {
    const sections: string[] = [];

    sections.push(sectionGenerators.header(recipient, isRtl));

    sections.push(
      sectionGenerators.paragraph(
        'تم تقديم طلب صلاحيات جديد يتطلب موافقتك. يرجى مراجعة التفاصيل أدناه واتخاذ الإجراء المناسب.',
        'A new privilege application has been submitted that requires your approval. Please review the details below and take appropriate action.',
        isRtl
      )
    );

    if (request.urgency === 'URGENT') {
      sections.push(
        sectionGenerators.warningBox(
          '⚠️ هذا الطلب عاجل ويتطلب اهتمامك الفوري.',
          '⚠️ This request is marked as URGENT and requires your immediate attention.',
          'warning',
          isRtl
        )
      );
    }

    sections.push(sectionGenerators.requestInfo(request, isRtl));
    sections.push(sectionGenerators.applicantDetails(request, isRtl));
    sections.push(
      sectionGenerators.privilegesSummary(
        request.privileges.map((p) => p.privilege),
        isRtl
      )
    );
    sections.push(
      sectionGenerators.approvalChain(
        request.approvalChain.steps,
        request.approvalChain.currentStep,
        isRtl
      )
    );

    return sections;
  };

  const footerActionsAr = sectionGenerators.ctaButton('مراجعة واتخاذ إجراء', 'Review & Take Action', actionUrl, true);
  const footerActionsEn = sectionGenerators.ctaButton('مراجعة واتخاذ إجراء', 'Review & Take Action', actionUrl, false);

  const htmlBody = generateBaseEmailTemplate({
    brand,
    titleAr: titles.ar,
    titleEn: titles.en,
    contentSectionsAr: generateContent(true),
    contentSectionsEn: generateContent(false),
    footerActionsAr,
    footerActionsEn,
  });

  const textBody = generatePlainTextEmail({
    titleAr: titles.ar,
    titleEn: titles.en,
    contentAr: `
السيد/السيدة ${recipient.nameAr}،

تم تقديم طلب صلاحيات جديد يتطلب موافقتك.

رقم الطلب: ${request.requestNumber}
مقدم الطلب: ${request.applicant.nameAr}
تاريخ التقديم: ${formatters.date(request.submittedAt, true)}

للمراجعة واتخاذ الإجراء، يرجى زيارة: ${actionUrl}
    `.trim(),
    contentEn: `
Dear ${recipient.nameEn},

A new privilege application has been submitted that requires your approval.

Request Number: ${request.requestNumber}
Applicant: ${request.applicant.nameEn}
Submission Date: ${formatters.date(request.submittedAt, false)}

To review and take action, please visit: ${actionUrl}
    `.trim(),
    footerTextAr: brand.footerTextAr,
    footerTextEn: brand.footerTextEn,
  });

  return {
    subject: `${titles.ar} | ${titles.en} - ${request.requestNumber}`,
    htmlBody,
    textBody,
  };
}

/**
 * Generate approval progress email
 */
export function generateApprovalProgressEmail(
  options: GenerateEmailOptions & { progressInfo: ApprovalProgressInfo }
): EmailContent {
  const { request, recipient, actionUrl, progressInfo, brand = defaultBrandConfig } = options;
  const titles = emailTitles[NotificationType.APPROVAL_PROGRESS];

  const generateContent = (isRtl: boolean): string[] => {
    const sections: string[] = [];

    sections.push(sectionGenerators.header(recipient, isRtl));

    const approverName = isRtl ? progressInfo.latestApprover.nameAr : progressInfo.latestApprover.nameEn;
    const action = progressInfo.latestAction === 'APPROVED'
      ? (isRtl ? 'وافق على' : 'approved')
      : (isRtl ? 'أحال' : 'forwarded');

    sections.push(
      sectionGenerators.paragraph(
        `نود إبلاغك بأن طلبك قد تقدم في سلسلة الموافقات. ${approverName} ${action} طلبك.`,
        `We would like to inform you that your application has progressed in the approval chain. ${approverName} has ${action} your request.`,
        isRtl
      )
    );

    sections.push(
      sectionGenerators.warningBox(
        `📊 التقدم: ${progressInfo.completedSteps} من ${progressInfo.totalSteps} خطوات مكتملة`,
        `📊 Progress: ${progressInfo.completedSteps} of ${progressInfo.totalSteps} steps completed`,
        'info',
        isRtl
      )
    );

    if (progressInfo.latestComments) {
      sections.push(
        sectionGenerators.paragraph(
          `تعليقات: "${progressInfo.latestComments}"`,
          `Comments: "${progressInfo.latestComments}"`,
          isRtl
        )
      );
    }

    sections.push(sectionGenerators.requestInfo(request, isRtl));
    sections.push(
      sectionGenerators.approvalChain(
        request.approvalChain.steps,
        request.approvalChain.currentStep,
        isRtl
      )
    );

    return sections;
  };

  const footerActionsAr = sectionGenerators.ctaButton('عرض التفاصيل', 'View Details', actionUrl, true);
  const footerActionsEn = sectionGenerators.ctaButton('عرض التفاصيل', 'View Details', actionUrl, false);

  const htmlBody = generateBaseEmailTemplate({
    brand,
    titleAr: titles.ar,
    titleEn: titles.en,
    contentSectionsAr: generateContent(true),
    contentSectionsEn: generateContent(false),
    footerActionsAr,
    footerActionsEn,
  });

  const textBody = generatePlainTextEmail({
    titleAr: titles.ar,
    titleEn: titles.en,
    contentAr: `
السيد/السيدة ${recipient.nameAr}،

نود إبلاغك بأن طلبك قد تقدم في سلسلة الموافقات.

رقم الطلب: ${request.requestNumber}
التقدم: ${progressInfo.completedSteps} من ${progressInfo.totalSteps} خطوات مكتملة

للاطلاع على التفاصيل، يرجى زيارة: ${actionUrl}
    `.trim(),
    contentEn: `
Dear ${recipient.nameEn},

We would like to inform you that your application has progressed in the approval chain.

Request Number: ${request.requestNumber}
Progress: ${progressInfo.completedSteps} of ${progressInfo.totalSteps} steps completed

To view details, please visit: ${actionUrl}
    `.trim(),
    footerTextAr: brand.footerTextAr,
    footerTextEn: brand.footerTextEn,
  });

  return {
    subject: `${titles.ar} | ${titles.en} - ${request.requestNumber}`,
    htmlBody,
    textBody,
  };
}

/**
 * Generate approval complete email
 */
export function generateApprovalCompleteEmail(options: GenerateEmailOptions): EmailContent {
  const { request, recipient, actionUrl, brand = defaultBrandConfig } = options;
  const titles = emailTitles[NotificationType.APPROVAL_COMPLETE];

  const generateContent = (isRtl: boolean): string[] => {
    const sections: string[] = [];

    sections.push(sectionGenerators.header(recipient, isRtl));

    sections.push(
      sectionGenerators.warningBox(
        '🎉 تهانينا! تمت الموافقة على طلب الصلاحيات الخاص بك بنجاح.',
        '🎉 Congratulations! Your privilege application has been successfully approved.',
        'success',
        isRtl
      )
    );

    sections.push(
      sectionGenerators.paragraph(
        'يسعدنا إبلاغك بأن جميع المراجعين قد وافقوا على طلبك. الصلاحيات المطلوبة متاحة الآن لك.',
        'We are pleased to inform you that all reviewers have approved your application. The requested privileges are now available to you.',
        isRtl
      )
    );

    sections.push(sectionGenerators.requestInfo(request, isRtl));
    sections.push(
      sectionGenerators.privilegesSummary(
        request.privileges.map((p) => p.privilege),
        isRtl
      )
    );
    sections.push(
      sectionGenerators.approvalChain(
        request.approvalChain.steps,
        request.approvalChain.currentStep,
        isRtl
      )
    );

    return sections;
  };

  const footerActionsAr = sectionGenerators.ctaButton('عرض الصلاحيات', 'View Privileges', actionUrl, true);
  const footerActionsEn = sectionGenerators.ctaButton('عرض الصلاحيات', 'View Privileges', actionUrl, false);

  const htmlBody = generateBaseEmailTemplate({
    brand,
    titleAr: titles.ar,
    titleEn: titles.en,
    contentSectionsAr: generateContent(true),
    contentSectionsEn: generateContent(false),
    footerActionsAr,
    footerActionsEn,
  });

  const textBody = generatePlainTextEmail({
    titleAr: titles.ar,
    titleEn: titles.en,
    contentAr: `
السيد/السيدة ${recipient.nameAr}،

تهانينا! تمت الموافقة على طلب الصلاحيات الخاص بك بنجاح.

رقم الطلب: ${request.requestNumber}
الصلاحيات الممنوحة:
${request.privileges.map((p) => `- ${p.privilege.nameAr}`).join('\n')}

لعرض صلاحياتك، يرجى زيارة: ${actionUrl}
    `.trim(),
    contentEn: `
Dear ${recipient.nameEn},

Congratulations! Your privilege application has been successfully approved.

Request Number: ${request.requestNumber}
Granted Privileges:
${request.privileges.map((p) => `- ${p.privilege.nameEn}`).join('\n')}

To view your privileges, please visit: ${actionUrl}
    `.trim(),
    footerTextAr: brand.footerTextAr,
    footerTextEn: brand.footerTextEn,
  });

  return {
    subject: `${titles.ar} | ${titles.en} - ${request.requestNumber}`,
    htmlBody,
    textBody,
  };
}

/**
 * Generate rejection email
 */
export function generateRejectionEmail(
  options: GenerateEmailOptions & { rejectionInfo: RejectionInfo }
): EmailContent {
  const { request, recipient, actionUrl, rejectionInfo, brand = defaultBrandConfig } = options;
  const titles = emailTitles[NotificationType.REJECTION];

  const generateContent = (isRtl: boolean): string[] => {
    const sections: string[] = [];

    sections.push(sectionGenerators.header(recipient, isRtl));

    sections.push(
      sectionGenerators.warningBox(
        '❌ نأسف لإبلاغك بأن طلب الصلاحيات الخاص بك قد تم رفضه.',
        '❌ We regret to inform you that your privilege application has been declined.',
        'error',
        isRtl
      )
    );

    const rejectorName = isRtl ? rejectionInfo.rejectedBy.nameAr : rejectionInfo.rejectedBy.nameEn;
    const reason = isRtl ? (rejectionInfo.reasonAr || rejectionInfo.reason) : rejectionInfo.reason;

    sections.push(
      sectionGenerators.paragraph(
        `تم الرفض بواسطة: ${rejectorName}`,
        `Declined by: ${rejectorName}`,
        isRtl
      )
    );

    sections.push(
      sectionGenerators.paragraph(
        `السبب: ${reason}`,
        `Reason: ${reason}`,
        isRtl
      )
    );

    if (rejectionInfo.canResubmit) {
      sections.push(
        sectionGenerators.warningBox(
          '💡 يمكنك تعديل طلبك وإعادة تقديمه.',
          '💡 You may modify your application and resubmit it.',
          'info',
          isRtl
        )
      );
    }

    sections.push(sectionGenerators.requestInfo(request, isRtl));
    sections.push(
      sectionGenerators.privilegesSummary(
        request.privileges.map((p) => p.privilege),
        isRtl
      )
    );

    return sections;
  };

  const footerActionsAr = rejectionInfo.canResubmit
    ? sectionGenerators.ctaButton('تعديل وإعادة التقديم', 'Modify & Resubmit', actionUrl, true)
    : sectionGenerators.ctaButton('عرض التفاصيل', 'View Details', actionUrl, true);
  const footerActionsEn = rejectionInfo.canResubmit
    ? sectionGenerators.ctaButton('تعديل وإعادة التقديم', 'Modify & Resubmit', actionUrl, false)
    : sectionGenerators.ctaButton('عرض التفاصيل', 'View Details', actionUrl, false);

  const htmlBody = generateBaseEmailTemplate({
    brand,
    titleAr: titles.ar,
    titleEn: titles.en,
    contentSectionsAr: generateContent(true),
    contentSectionsEn: generateContent(false),
    footerActionsAr,
    footerActionsEn,
  });

  const textBody = generatePlainTextEmail({
    titleAr: titles.ar,
    titleEn: titles.en,
    contentAr: `
السيد/السيدة ${recipient.nameAr}،

نأسف لإبلاغك بأن طلب الصلاحيات الخاص بك قد تم رفضه.

رقم الطلب: ${request.requestNumber}
تم الرفض بواسطة: ${rejectionInfo.rejectedBy.nameAr}
السبب: ${rejectionInfo.reasonAr || rejectionInfo.reason}

${rejectionInfo.canResubmit ? 'يمكنك تعديل طلبك وإعادة تقديمه.' : ''}

للمزيد من التفاصيل، يرجى زيارة: ${actionUrl}
    `.trim(),
    contentEn: `
Dear ${recipient.nameEn},

We regret to inform you that your privilege application has been declined.

Request Number: ${request.requestNumber}
Declined by: ${rejectionInfo.rejectedBy.nameEn}
Reason: ${rejectionInfo.reason}

${rejectionInfo.canResubmit ? 'You may modify your application and resubmit it.' : ''}

For more details, please visit: ${actionUrl}
    `.trim(),
    footerTextAr: brand.footerTextAr,
    footerTextEn: brand.footerTextEn,
  });

  return {
    subject: `${titles.ar} | ${titles.en} - ${request.requestNumber}`,
    htmlBody,
    textBody,
  };
}

/**
 * Generate modifications requested email
 */
export function generateModificationsRequestedEmail(
  options: GenerateEmailOptions & { modificationInfo: ModificationInfo }
): EmailContent {
  const { request, recipient, actionUrl, modificationInfo, brand = defaultBrandConfig } = options;
  const titles = emailTitles[NotificationType.MODIFICATIONS_REQUESTED];

  const generateContent = (isRtl: boolean): string[] => {
    const sections: string[] = [];

    sections.push(sectionGenerators.header(recipient, isRtl));

    sections.push(
      sectionGenerators.warningBox(
        '📝 يتطلب طلبك بعض التعديلات قبل المتابعة.',
        '📝 Your application requires some modifications before proceeding.',
        'warning',
        isRtl
      )
    );

    const requesterName = isRtl ? modificationInfo.requestedBy.nameAr : modificationInfo.requestedBy.nameEn;
    const comments = isRtl ? (modificationInfo.commentsAr || modificationInfo.comments) : modificationInfo.comments;

    sections.push(
      sectionGenerators.paragraph(
        `طلب التعديل من: ${requesterName}`,
        `Modification requested by: ${requesterName}`,
        isRtl
      )
    );

    sections.push(
      sectionGenerators.paragraph(
        `التعليقات: ${comments}`,
        `Comments: ${comments}`,
        isRtl
      )
    );

    if (modificationInfo.specificChanges && modificationInfo.specificChanges.length > 0) {
      const changes = isRtl
        ? (modificationInfo.specificChangesAr || modificationInfo.specificChanges)
        : modificationInfo.specificChanges;

      const changesListHtml = changes.map((change) => `<li style="margin-bottom: 8px;">${change}</li>`).join('\n');

      sections.push(`
        <div style="margin: 16px 0;">
          <strong>${isRtl ? 'التغييرات المطلوبة:' : 'Required Changes:'}</strong>
          <ul style="margin: 8px 0; padding: ${isRtl ? '0 20px 0 0' : '0 0 0 20px'};">
            ${changesListHtml}
          </ul>
        </div>
      `);
    }

    if (modificationInfo.deadline) {
      sections.push(
        sectionGenerators.warningBox(
          `⏰ الموعد النهائي للتعديلات: ${formatters.datetime(modificationInfo.deadline, true)}`,
          `⏰ Deadline for modifications: ${formatters.datetime(modificationInfo.deadline, false)}`,
          'warning',
          isRtl
        )
      );
    }

    sections.push(sectionGenerators.requestInfo(request, isRtl));

    return sections;
  };

  const footerActionsAr = sectionGenerators.ctaButton('تعديل الطلب', 'Modify Application', actionUrl, true);
  const footerActionsEn = sectionGenerators.ctaButton('تعديل الطلب', 'Modify Application', actionUrl, false);

  const htmlBody = generateBaseEmailTemplate({
    brand,
    titleAr: titles.ar,
    titleEn: titles.en,
    contentSectionsAr: generateContent(true),
    contentSectionsEn: generateContent(false),
    footerActionsAr,
    footerActionsEn,
  });

  const textBody = generatePlainTextEmail({
    titleAr: titles.ar,
    titleEn: titles.en,
    contentAr: `
السيد/السيدة ${recipient.nameAr}،

يتطلب طلبك بعض التعديلات قبل المتابعة.

رقم الطلب: ${request.requestNumber}
طلب التعديل من: ${modificationInfo.requestedBy.nameAr}
التعليقات: ${modificationInfo.commentsAr || modificationInfo.comments}

${modificationInfo.deadline ? `الموعد النهائي: ${formatters.datetime(modificationInfo.deadline, true)}` : ''}

لتعديل طلبك، يرجى زيارة: ${actionUrl}
    `.trim(),
    contentEn: `
Dear ${recipient.nameEn},

Your application requires some modifications before proceeding.

Request Number: ${request.requestNumber}
Modification requested by: ${modificationInfo.requestedBy.nameEn}
Comments: ${modificationInfo.comments}

${modificationInfo.deadline ? `Deadline: ${formatters.datetime(modificationInfo.deadline, false)}` : ''}

To modify your application, please visit: ${actionUrl}
    `.trim(),
    footerTextAr: brand.footerTextAr,
    footerTextEn: brand.footerTextEn,
  });

  return {
    subject: `${titles.ar} | ${titles.en} - ${request.requestNumber}`,
    htmlBody,
    textBody,
  };
}

/**
 * Generate escalation email
 */
export function generateEscalationEmail(
  options: GenerateEmailOptions & { escalationInfo: EscalationInfo }
): EmailContent {
  const { request, recipient, actionUrl, escalationInfo, brand = defaultBrandConfig } = options;

  let notificationType: NotificationType;
  switch (escalationInfo.level) {
    case EscalationLevel.REMINDER:
      notificationType = NotificationType.ESCALATION_REMINDER;
      break;
    case EscalationLevel.MANAGER:
      notificationType = NotificationType.ESCALATION_MANAGER;
      break;
    case EscalationLevel.HR:
      notificationType = NotificationType.ESCALATION_HR;
      break;
    default:
      notificationType = NotificationType.ESCALATION_REMINDER;
  }

  const titles = emailTitles[notificationType];

  const generateContent = (isRtl: boolean): string[] => {
    const sections: string[] = [];

    sections.push(sectionGenerators.header(recipient, isRtl));

    const pendingDuration = formatters.duration(escalationInfo.hoursPending, isRtl);
    const originalApproverName = isRtl
      ? escalationInfo.originalApprover.nameAr
      : escalationInfo.originalApprover.nameEn;

    if (escalationInfo.level === EscalationLevel.REMINDER) {
      sections.push(
        sectionGenerators.warningBox(
          `⏰ تذكير: لديك طلب موافقة معلق منذ ${pendingDuration}.`,
          `⏰ Reminder: You have a pending approval request for ${pendingDuration}.`,
          'warning',
          isRtl
        )
      );

      sections.push(
        sectionGenerators.paragraph(
          'يرجى مراجعة الطلب واتخاذ الإجراء المناسب في أقرب وقت ممكن لتجنب المزيد من التصعيد.',
          'Please review the request and take appropriate action as soon as possible to avoid further escalation.',
          isRtl
        )
      );
    } else if (escalationInfo.level === EscalationLevel.MANAGER) {
      sections.push(
        sectionGenerators.warningBox(
          `⚠️ تصعيد: طلب موافقة معلق منذ ${pendingDuration} يتطلب انتباه الإدارة.`,
          `⚠️ Escalation: A pending approval request for ${pendingDuration} requires management attention.`,
          'warning',
          isRtl
        )
      );

      sections.push(
        sectionGenerators.paragraph(
          `المعتمد الأصلي (${originalApproverName}) لم يتخذ إجراءً. بصفتك مديرهم، يرجى مراجعة الطلب أو المتابعة مع فريقك.`,
          `The original approver (${originalApproverName}) has not taken action. As their manager, please review the request or follow up with your team.`,
          isRtl
        )
      );
    } else if (escalationInfo.level === EscalationLevel.HR) {
      sections.push(
        sectionGenerators.warningBox(
          `🚨 تصعيد حرج: طلب موافقة معلق منذ ${pendingDuration} يتطلب تدخل الموارد البشرية فوراً.`,
          `🚨 Critical Escalation: A pending approval request for ${pendingDuration} requires immediate HR intervention.`,
          'error',
          isRtl
        )
      );

      sections.push(
        sectionGenerators.paragraph(
          `هذا الطلب تجاوز جميع مستويات التصعيد دون حل. المعتمد الأصلي (${originalApproverName}) ومديرهم لم يتخذوا إجراءً. يرجى التحقيق في هذا الأمر على الفور.`,
          `This request has exceeded all escalation levels without resolution. The original approver (${originalApproverName}) and their manager have not taken action. Please investigate this matter immediately.`,
          isRtl
        )
      );
    }

    sections.push(sectionGenerators.requestInfo(request, isRtl));
    sections.push(sectionGenerators.applicantDetails(request, isRtl));
    sections.push(
      sectionGenerators.privilegesSummary(
        request.privileges.map((p) => p.privilege),
        isRtl
      )
    );

    return sections;
  };

  const footerActionsAr = sectionGenerators.ctaButton('مراجعة واتخاذ إجراء', 'Review & Take Action', actionUrl, true);
  const footerActionsEn = sectionGenerators.ctaButton('مراجعة واتخاذ إجراء', 'Review & Take Action', actionUrl, false);

  const htmlBody = generateBaseEmailTemplate({
    brand,
    titleAr: titles.ar,
    titleEn: titles.en,
    contentSectionsAr: generateContent(true),
    contentSectionsEn: generateContent(false),
    footerActionsAr,
    footerActionsEn,
  });

  const levelText: Record<EscalationLevel, { ar: string; en: string }> = {
    [EscalationLevel.NONE]: { ar: 'إشعار', en: 'Notice' },
    [EscalationLevel.REMINDER]: { ar: 'تذكير', en: 'Reminder' },
    [EscalationLevel.MANAGER]: { ar: 'تصعيد للمدير', en: 'Manager Escalation' },
    [EscalationLevel.HR]: { ar: 'تصعيد للموارد البشرية', en: 'HR Escalation' },
  };

  const textBody = generatePlainTextEmail({
    titleAr: titles.ar,
    titleEn: titles.en,
    contentAr: `
السيد/السيدة ${recipient.nameAr}،

${levelText[escalationInfo.level]?.ar || 'تذكير'}: طلب موافقة معلق منذ ${formatters.duration(escalationInfo.hoursPending, true)}.

رقم الطلب: ${request.requestNumber}
مقدم الطلب: ${request.applicant.nameAr}
المعتمد الأصلي: ${escalationInfo.originalApprover.nameAr}

للمراجعة واتخاذ الإجراء، يرجى زيارة: ${actionUrl}
    `.trim(),
    contentEn: `
Dear ${recipient.nameEn},

${levelText[escalationInfo.level]?.en || 'Reminder'}: A pending approval request for ${formatters.duration(escalationInfo.hoursPending, false)}.

Request Number: ${request.requestNumber}
Applicant: ${request.applicant.nameEn}
Original Approver: ${escalationInfo.originalApprover.nameEn}

To review and take action, please visit: ${actionUrl}
    `.trim(),
    footerTextAr: brand.footerTextAr,
    footerTextEn: brand.footerTextEn,
  });

  return {
    subject: `${titles.ar} | ${titles.en} - ${request.requestNumber}`,
    htmlBody,
    textBody,
  };
}

// ============================================================================
// Main Generate Email Function
// ============================================================================

export interface GenerateEmailParams {
  type: NotificationType;
  request: PrivilegeApplicationRequest;
  recipient: NotificationRecipient;
  actionUrl: string;
  brand?: EmailBrandConfig;
  progressInfo?: ApprovalProgressInfo;
  rejectionInfo?: RejectionInfo;
  modificationInfo?: ModificationInfo;
  escalationInfo?: EscalationInfo;
}

/**
 * Main email generation function that routes to the appropriate generator
 */
export function generateEmail(params: GenerateEmailParams): EmailContent {
  const { type, request, recipient, actionUrl, brand } = params;
  const baseOptions: GenerateEmailOptions = { request, recipient, actionUrl, brand };

  switch (type) {
    case NotificationType.APPROVAL_REQUIRED:
      return generateApprovalRequiredEmail(baseOptions);

    case NotificationType.APPROVAL_PROGRESS:
      if (!params.progressInfo) {
        throw new Error('progressInfo is required for APPROVAL_PROGRESS notifications');
      }
      return generateApprovalProgressEmail({ ...baseOptions, progressInfo: params.progressInfo });

    case NotificationType.APPROVAL_COMPLETE:
      return generateApprovalCompleteEmail(baseOptions);

    case NotificationType.REJECTION:
      if (!params.rejectionInfo) {
        throw new Error('rejectionInfo is required for REJECTION notifications');
      }
      return generateRejectionEmail({ ...baseOptions, rejectionInfo: params.rejectionInfo });

    case NotificationType.MODIFICATIONS_REQUESTED:
      if (!params.modificationInfo) {
        throw new Error('modificationInfo is required for MODIFICATIONS_REQUESTED notifications');
      }
      return generateModificationsRequestedEmail({ ...baseOptions, modificationInfo: params.modificationInfo });

    case NotificationType.ESCALATION_REMINDER:
    case NotificationType.ESCALATION_MANAGER:
    case NotificationType.ESCALATION_HR:
      if (!params.escalationInfo) {
        throw new Error('escalationInfo is required for escalation notifications');
      }
      return generateEscalationEmail({ ...baseOptions, escalationInfo: params.escalationInfo });

    default:
      throw new Error(`Unknown notification type: ${type}`);
  }
}

const emailGenerator = {
  formatters,
  sectionGenerators,
  generateEmail,
  generateApprovalRequiredEmail,
  generateApprovalProgressEmail,
  generateApprovalCompleteEmail,
  generateRejectionEmail,
  generateModificationsRequestedEmail,
  generateEscalationEmail,
};

export default emailGenerator;
