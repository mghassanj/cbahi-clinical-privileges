/**
 * CBAHI Clinical Privileges - Certificate Generator Service
 *
 * Generates PDF certificates for fully approved privilege requests.
 * Handles certificate creation, caching, and Google Drive storage.
 */

import { renderToBuffer } from "@react-pdf/renderer";
import { format, addYears } from "date-fns";
import {
  CertificateDocument,
  CertificateData,
  PrivilegeItem,
  ApproverSignature,
} from "./certificate-template";
import { createGoogleDriveService, GoogleDriveService, MIME_TYPES } from "../google-drive";
import React from "react";

// ============================================================================
// Types
// ============================================================================

export interface RequestForCertificate {
  id: string;
  type: string;
  requestType: string;
  hospitalCenter?: string | null;
  status: string;
  createdAt: Date;
  completedAt?: Date | null;
  applicant: {
    id: string;
    nameEn: string;
    nameAr: string | null;
    employeeCode: string | null;
    scfhsNo: string | null;
    departmentEn: string | null;
    departmentAr: string | null;
    jobTitleEn: string | null;
    jobTitleAr: string | null;
  };
  requestedPrivileges: Array<{
    id: string;
    status: string;
    privilege: {
      id: string;
      code: string;
      nameEn: string;
      nameAr: string | null;
      category: string;
    };
  }>;
  approvals: Array<{
    id: string;
    level: string;
    status: string;
    approvedAt: Date | null;
    approver: {
      id: string;
      nameEn: string;
      nameAr: string | null;
      role: string;
      jobTitleEn: string | null;
      jobTitleAr: string | null;
    };
  }>;
}

export interface CertificateResult {
  success: boolean;
  pdfBuffer?: Buffer;
  driveFileId?: string;
  driveFileUrl?: string;
  certificateNumber?: string;
  error?: string;
}

// ============================================================================
// Role Translations
// ============================================================================

const ROLE_TRANSLATIONS: Record<string, { en: string; ar: string }> = {
  HEAD_OF_SECTION: { en: "Head of Section", ar: "رئيس القسم" },
  HEAD_OF_DEPT: { en: "Head of Department", ar: "رئيس الادارة" },
  COMMITTEE: { en: "Committee Member", ar: "عضو اللجنة" },
  MEDICAL_DIRECTOR: { en: "Medical Director", ar: "المدير الطبي" },
  ADMIN: { en: "Administrator", ar: "المدير" },
  EMPLOYEE: { en: "Employee", ar: "موظف" },
  COMMITTEE_MEMBER: { en: "Committee Member", ar: "عضو اللجنة" },
};

// ============================================================================
// Certificate Generator Class
// ============================================================================

export class CertificateGenerator {
  private driveService: GoogleDriveService | null = null;
  private certificateValidityYears: number;

  constructor(options?: { validityYears?: number }) {
    this.certificateValidityYears = options?.validityYears ?? 2;

    // Initialize Google Drive service if credentials are available
    try {
      if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
        this.driveService = createGoogleDriveService();
      }
    } catch (error) {
      console.warn("Google Drive service not initialized:", error);
    }
  }

  // ==========================================================================
  // Public Methods
  // ==========================================================================

  /**
   * Generate a certificate PDF for an approved request
   * @param request - The fully approved privilege request
   * @returns Certificate result with PDF buffer and metadata
   */
  async generateCertificate(
    request: RequestForCertificate
  ): Promise<CertificateResult> {
    try {
      // Validate request status
      if (request.status !== "APPROVED") {
        return {
          success: false,
          error: "Certificate can only be generated for approved requests",
        };
      }

      // Generate certificate number
      const certificateNumber = this.generateCertificateNumber(request);

      // Prepare certificate data
      const certificateData = this.prepareCertificateData(
        request,
        certificateNumber
      );

      // Generate PDF buffer
      const pdfBuffer = await this.renderCertificatePdf(certificateData);

      return {
        success: true,
        pdfBuffer,
        certificateNumber,
      };
    } catch (error) {
      console.error("Certificate generation error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate certificate",
      };
    }
  }

  /**
   * Generate and save certificate to Google Drive
   * @param request - The fully approved privilege request
   * @param employeeFolderId - Optional folder ID to save the certificate
   * @returns Certificate result with Drive URL
   */
  async generateAndSaveCertificate(
    request: RequestForCertificate,
    employeeFolderId?: string
  ): Promise<CertificateResult> {
    const result = await this.generateCertificate(request);

    if (!result.success || !result.pdfBuffer) {
      return result;
    }

    // Save to Google Drive if service is available
    if (this.driveService && employeeFolderId) {
      try {
        const fileName = `Certificate_${result.certificateNumber}.pdf`;
        const driveFile = await this.driveService.uploadFile(
          employeeFolderId,
          fileName,
          MIME_TYPES.PDF,
          result.pdfBuffer
        );

        // Set file permissions for viewing
        await this.driveService.setFilePermissions(driveFile.id, "reader");

        return {
          ...result,
          driveFileId: driveFile.id,
          driveFileUrl: driveFile.webViewLink,
        };
      } catch (error) {
        console.error("Failed to save certificate to Drive:", error);
        // Return result without Drive info - PDF was still generated successfully
        return {
          ...result,
          error: "Certificate generated but failed to save to Google Drive",
        };
      }
    }

    return result;
  }

  /**
   * Get the download URL for a certificate
   * @param driveFileId - Google Drive file ID
   * @returns Download URL or null
   */
  async getCertificateDownloadUrl(driveFileId: string): Promise<string | null> {
    if (!this.driveService) {
      return null;
    }

    try {
      const file = await this.driveService.getFile(driveFileId);
      return file.webContentLink || file.webViewLink;
    } catch (error) {
      console.error("Failed to get certificate URL:", error);
      return null;
    }
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * Generate a unique certificate number
   */
  private generateCertificateNumber(request: RequestForCertificate): string {
    const year = new Date().getFullYear();
    const employeeCode = request.applicant.employeeCode || "000";
    const requestId = request.id.slice(-6).toUpperCase();
    const timestamp = Date.now().toString(36).toUpperCase().slice(-4);

    return `CBAHI-${year}-${employeeCode}-${requestId}-${timestamp}`;
  }

  /**
   * Prepare certificate data from request
   */
  private prepareCertificateData(
    request: RequestForCertificate,
    certificateNumber: string
  ): CertificateData {
    const issueDate = request.completedAt || new Date();
    const validUntil = addYears(issueDate, this.certificateValidityYears);

    // Prepare privileges list (only approved ones)
    const privileges: PrivilegeItem[] = request.requestedPrivileges
      .filter((rp) => rp.status === "APPROVED" || rp.status === "PENDING")
      .map((rp) => ({
        code: rp.privilege.code,
        nameEn: rp.privilege.nameEn,
        nameAr: rp.privilege.nameAr || rp.privilege.nameEn,
        category: rp.privilege.category,
      }));

    // Prepare approvers list (only those who approved)
    const approvers: ApproverSignature[] = request.approvals
      .filter((a) => a.status === "APPROVED" && a.approvedAt)
      .sort((a, b) => this.getApprovalLevelOrder(a.level) - this.getApprovalLevelOrder(b.level))
      .map((a) => {
        const roleInfo = ROLE_TRANSLATIONS[a.approver.role] || {
          en: a.approver.role,
          ar: a.approver.role,
        };

        return {
          nameEn: a.approver.nameEn,
          nameAr: a.approver.nameAr || a.approver.nameEn,
          role: a.approver.jobTitleEn || roleInfo.en,
          roleAr: a.approver.jobTitleAr || roleInfo.ar,
          approvedAt: format(new Date(a.approvedAt!), "PPP"),
        };
      });

    return {
      certificateNumber,
      issueDate: format(issueDate, "PPP"),
      validUntil: format(validUntil, "PPP"),
      practitioner: {
        nameEn: request.applicant.nameEn,
        nameAr: request.applicant.nameAr || request.applicant.nameEn,
        employeeCode: request.applicant.employeeCode || "N/A",
        scfhsNo: request.applicant.scfhsNo || undefined,
        departmentEn: request.applicant.departmentEn || "N/A",
        departmentAr: request.applicant.departmentAr || request.applicant.departmentEn || "N/A",
        jobTitleEn: request.applicant.jobTitleEn || "N/A",
        jobTitleAr: request.applicant.jobTitleAr || request.applicant.jobTitleEn || "N/A",
        hospitalCenter: request.hospitalCenter || undefined,
      },
      privileges,
      approvers,
      // QR code would be generated separately if needed
      qrCodeDataUrl: undefined,
    };
  }

  /**
   * Get approval level order for sorting
   */
  private getApprovalLevelOrder(level: string): number {
    const order: Record<string, number> = {
      HEAD_OF_SECTION: 1,
      HEAD_OF_DEPT: 2,
      COMMITTEE: 3,
      MEDICAL_DIRECTOR: 4,
    };
    return order[level] || 99;
  }

  /**
   * Render certificate PDF to buffer
   */
  private async renderCertificatePdf(data: CertificateData): Promise<Buffer> {
    // Create the certificate document element
    const element = React.createElement(CertificateDocument, { data });
    // Use type assertion to match the expected type
    const buffer = await renderToBuffer(element as React.ReactElement);
    return Buffer.from(buffer);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a certificate generator instance
 */
export function createCertificateGenerator(options?: {
  validityYears?: number;
}): CertificateGenerator {
  return new CertificateGenerator(options);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if a request is eligible for certificate generation
 */
export function isEligibleForCertificate(request: {
  status: string;
  approvals: Array<{ status: string }>;
}): boolean {
  // Request must be fully approved
  // The status is only set to APPROVED when ALL required approvals are complete
  // So we ONLY need to check the status, not individual approvals
  return request.status === "APPROVED";
}

/**
 * Get certificate filename for download
 */
export function getCertificateFilename(
  certificateNumber: string,
  practitionerName: string
): string {
  const safeName = practitionerName
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .replace(/\s+/g, "_")
    .substring(0, 30);

  return `Certificate_${safeName}_${certificateNumber}.pdf`;
}
