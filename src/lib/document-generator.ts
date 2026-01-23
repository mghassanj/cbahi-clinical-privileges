/**
 * CBAHI Clinical Privileges - Document Generator
 *
 * Orchestrates the generation of all required documents for privilege requests:
 * - Clinical Privileges Checklist
 * - Privileges Form (with checkbox selections)
 * - Approval Form
 *
 * Manages the full workflow from template copying to PDF export.
 */

import {
  GoogleDriveService,
  DriveFile,
  EmployeeFolderInfo,
  RequestFolderInfo,
} from './google-drive';
import {
  GoogleDocsService,
  PlaceholderData,
  CheckboxData,
  generateApplicantPlaceholders,
  generateDatePlaceholders,
} from './google-docs';

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * Privilege request data structure for document generation
 */
export interface PrivilegeRequest {
  id: string;
  requestNumber: string;
  applicant: {
    id: string;
    employeeCode: string;
    nameEn: string;
    nameAr: string;
    email?: string;
    phone?: string;
    idNumber?: string;
    scfhsNumber?: string;
    department?: string;
    departmentAr?: string;
    jobTitle?: string;
    jobTitleAr?: string;
    specialty?: string;
    specialtyAr?: string;
    licenseNumber?: string;
    licenseExpiry?: Date;
    yearsOfExperience?: number;
  };
  privileges: PrivilegeItem[];
  hospital?: string;
  hospitalAr?: string;
  center?: string;
  centerAr?: string;
  submittedAt: Date;
  status: string;
  notes?: string;
  notesAr?: string;
  urgency?: 'NORMAL' | 'HIGH' | 'URGENT';
}

export interface PrivilegeItem {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string;
  category: string;
  isRequested: boolean;
  requiresSupervision?: boolean;
  supervisionDuration?: number;
  justification?: string;
}

/**
 * Result of generating a single document
 */
export interface DocumentResult {
  docId: string;
  docUrl: string;
  pdfUrl?: string;
  pdfBuffer?: Buffer;
  title: string;
  createdAt: Date;
}

/**
 * Result of uploading an attachment
 */
export interface AttachmentResult {
  fileId: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  uploadedAt: Date;
}

/**
 * Complete set of generated documents for a request
 */
export interface GeneratedDocuments {
  requestId: string;
  requestNumber: string;
  employeeFolder: EmployeeFolderInfo;
  requestFolder: RequestFolderInfo;
  checklistDocId: string;
  checklistDocUrl: string;
  checklistPdfUrl: string;
  privilegesFormDocId: string;
  privilegesFormDocUrl: string;
  privilegesFormPdfUrl: string;
  approvalFormDocId: string;
  approvalFormDocUrl: string;
  approvalFormPdfUrl: string;
  generatedAt: Date;
}

/**
 * Template IDs configuration
 */
export interface TemplateIds {
  checklist: string;
  privilegesForm: string;
  approvalForm: string;
}

/**
 * Document generator configuration
 */
export interface DocumentGeneratorConfig {
  templateIds: TemplateIds;
  hospitalName?: string;
  hospitalNameAr?: string;
  centerName?: string;
  centerNameAr?: string;
  generatePdfs?: boolean;
  uploadPdfsToFolder?: boolean;
}

// ============================================================================
// Document Generator Class
// ============================================================================

export class DocumentGenerator {
  private driveService: GoogleDriveService;
  private docsService: GoogleDocsService;
  private config: DocumentGeneratorConfig;

  /**
   * Initialize document generator with Google services
   * @param driveService - Initialized Google Drive service
   * @param docsService - Initialized Google Docs service
   * @param config - Generator configuration including template IDs
   */
  constructor(
    driveService: GoogleDriveService,
    docsService: GoogleDocsService,
    config: DocumentGeneratorConfig
  ) {
    this.driveService = driveService;
    this.docsService = docsService;
    this.config = config;
  }

  // ==========================================================================
  // Main Generation Methods
  // ==========================================================================

  /**
   * Generate all documents for a privilege request
   * Creates folder structure, generates documents from templates, and exports PDFs
   * @param request - Privilege request data
   * @returns Complete set of generated documents with URLs
   */
  async generateRequestDocuments(request: PrivilegeRequest): Promise<GeneratedDocuments> {
    try {
      // Step 1: Create folder structure
      const employeeFolder = await this.driveService.createEmployeeFolder(
        request.applicant.nameEn,
        request.applicant.employeeCode
      );

      const requestFolder = await this.driveService.createRequestFolder(
        employeeFolder.folderId,
        request.requestNumber
      );

      // Step 2: Generate all documents in parallel
      const [checklist, privilegesForm, approvalForm] = await Promise.all([
        this.generateChecklist(request, requestFolder.folderId),
        this.generatePrivilegesForm(request, requestFolder.folderId),
        this.generateApprovalForm(request, requestFolder.folderId),
      ]);

      // Step 3: Export PDFs if configured
      let checklistPdfUrl = checklist.docUrl;
      let privilegesPdfUrl = privilegesForm.docUrl;
      let approvalPdfUrl = approvalForm.docUrl;

      if (this.config.generatePdfs !== false) {
        const [checklistPdf, privilegesPdf, approvalPdf] = await Promise.all([
          this.exportAndUploadPdf(checklist.docId, `${checklist.title}.pdf`, requestFolder.folderId),
          this.exportAndUploadPdf(privilegesForm.docId, `${privilegesForm.title}.pdf`, requestFolder.folderId),
          this.exportAndUploadPdf(approvalForm.docId, `${approvalForm.title}.pdf`, requestFolder.folderId),
        ]);

        checklistPdfUrl = checklistPdf.fileUrl;
        privilegesPdfUrl = privilegesPdf.fileUrl;
        approvalPdfUrl = approvalPdf.fileUrl;
      }

      return {
        requestId: request.id,
        requestNumber: request.requestNumber,
        employeeFolder,
        requestFolder,
        checklistDocId: checklist.docId,
        checklistDocUrl: checklist.docUrl,
        checklistPdfUrl,
        privilegesFormDocId: privilegesForm.docId,
        privilegesFormDocUrl: privilegesForm.docUrl,
        privilegesFormPdfUrl: privilegesPdfUrl,
        approvalFormDocId: approvalForm.docId,
        approvalFormDocUrl: approvalForm.docUrl,
        approvalFormPdfUrl: approvalPdfUrl,
        generatedAt: new Date(),
      };
    } catch (error) {
      throw this.handleError('generateRequestDocuments', error);
    }
  }

  /**
   * Generate the Clinical Privileges Checklist document
   * @param request - Privilege request data
   * @param folderId - Target folder ID
   * @returns Generated document result
   */
  async generateChecklist(request: PrivilegeRequest, folderId: string): Promise<DocumentResult> {
    try {
      const title = `Checklist_${request.requestNumber}_${request.applicant.nameEn}`;

      // Copy template
      const docId = await this.docsService.copyTemplate(
        this.config.templateIds.checklist,
        title,
        folderId
      );

      // Prepare placeholders
      const placeholders = this.buildChecklistPlaceholders(request);

      // Fill placeholders
      await this.docsService.fillPlaceholders(docId, placeholders);

      // Fill checklist checkboxes
      const checkboxes = this.buildChecklistCheckboxes(request);
      await this.docsService.fillCheckboxes(docId, checkboxes);

      // Clear any remaining unfilled placeholders
      await this.docsService.clearUnfilledPlaceholders(docId, '---');

      const docUrl = await this.driveService.getFileUrl(docId);

      return {
        docId,
        docUrl,
        title,
        createdAt: new Date(),
      };
    } catch (error) {
      throw this.handleError('generateChecklist', error);
    }
  }

  /**
   * Generate the Privileges Form document with selected privileges
   * @param request - Privilege request data
   * @param folderId - Target folder ID
   * @returns Generated document result
   */
  async generatePrivilegesForm(request: PrivilegeRequest, folderId: string): Promise<DocumentResult> {
    try {
      const title = `Privileges_${request.requestNumber}_${request.applicant.nameEn}`;

      // Copy template
      const docId = await this.docsService.copyTemplate(
        this.config.templateIds.privilegesForm,
        title,
        folderId
      );

      // Prepare placeholders
      const placeholders = this.buildPrivilegesFormPlaceholders(request);

      // Fill placeholders
      await this.docsService.fillPlaceholders(docId, placeholders);

      // Fill privilege checkboxes
      const checkboxes = this.buildPrivilegeCheckboxes(request);
      await this.docsService.fillCheckboxes(docId, checkboxes);

      // Clear any remaining unfilled placeholders
      await this.docsService.clearUnfilledPlaceholders(docId, '');

      const docUrl = await this.driveService.getFileUrl(docId);

      return {
        docId,
        docUrl,
        title,
        createdAt: new Date(),
      };
    } catch (error) {
      throw this.handleError('generatePrivilegesForm', error);
    }
  }

  /**
   * Generate the Approval Form document
   * @param request - Privilege request data
   * @param folderId - Target folder ID
   * @returns Generated document result
   */
  async generateApprovalForm(request: PrivilegeRequest, folderId: string): Promise<DocumentResult> {
    try {
      const title = `Approval_${request.requestNumber}_${request.applicant.nameEn}`;

      // Copy template
      const docId = await this.docsService.copyTemplate(
        this.config.templateIds.approvalForm,
        title,
        folderId
      );

      // Prepare placeholders
      const placeholders = this.buildApprovalFormPlaceholders(request);

      // Fill placeholders
      await this.docsService.fillPlaceholders(docId, placeholders);

      // Clear any remaining unfilled placeholders
      await this.docsService.clearUnfilledPlaceholders(docId, '');

      const docUrl = await this.driveService.getFileUrl(docId);

      return {
        docId,
        docUrl,
        title,
        createdAt: new Date(),
      };
    } catch (error) {
      throw this.handleError('generateApprovalForm', error);
    }
  }

  // ==========================================================================
  // Attachment Operations
  // ==========================================================================

  /**
   * Upload an attachment file to the request's attachment folder
   * @param requestFolderId - Request folder ID
   * @param file - File object with name, type, and content
   * @returns Upload result with file URL
   */
  async uploadAttachment(
    requestFolderId: string,
    file: {
      name: string;
      type: string;
      content: Buffer;
    }
  ): Promise<AttachmentResult> {
    try {
      // Get or create the Attachments subfolder
      const attachmentsFolderId = await this.driveService.getOrCreateFolder('Attachments', requestFolderId);

      // Upload the file
      const driveFile = await this.driveService.uploadFile(
        attachmentsFolderId,
        file.name,
        file.type,
        file.content
      );

      return {
        fileId: driveFile.id,
        fileName: driveFile.name,
        fileUrl: driveFile.webViewLink,
        mimeType: driveFile.mimeType,
        uploadedAt: new Date(),
      };
    } catch (error) {
      throw this.handleError('uploadAttachment', error);
    }
  }

  /**
   * Upload multiple attachments
   * @param requestFolderId - Request folder ID
   * @param files - Array of files to upload
   * @returns Array of upload results
   */
  async uploadAttachments(
    requestFolderId: string,
    files: Array<{
      name: string;
      type: string;
      content: Buffer;
    }>
  ): Promise<AttachmentResult[]> {
    const results: AttachmentResult[] = [];

    for (const file of files) {
      const result = await this.uploadAttachment(requestFolderId, file);
      results.push(result);
    }

    return results;
  }

  // ==========================================================================
  // PDF Export Operations
  // ==========================================================================

  /**
   * Export a document as PDF and upload to a folder
   * @param docId - Google Doc ID
   * @param fileName - PDF file name
   * @param folderId - Target folder ID
   * @returns Uploaded PDF file info
   */
  async exportAndUploadPdf(
    docId: string,
    fileName: string,
    folderId: string
  ): Promise<{ fileId: string; fileUrl: string }> {
    try {
      // Export as PDF
      const pdfBuffer = await this.driveService.exportAsPdf(docId);

      // Upload to folder
      const driveFile = await this.driveService.uploadFile(
        folderId,
        fileName,
        'application/pdf',
        pdfBuffer
      );

      // Make PDF readable by anyone with link
      await this.driveService.setFilePermissions(driveFile.id, 'reader');

      return {
        fileId: driveFile.id,
        fileUrl: driveFile.webViewLink,
      };
    } catch (error) {
      throw this.handleError('exportAndUploadPdf', error);
    }
  }

  /**
   * Export a document as PDF buffer (without uploading)
   * @param docId - Google Doc ID
   * @returns PDF content as Buffer
   */
  async exportAsPdf(docId: string): Promise<Buffer> {
    return this.driveService.exportAsPdf(docId);
  }

  // ==========================================================================
  // Regeneration Methods
  // ==========================================================================

  /**
   * Regenerate a specific document (e.g., after modifications)
   * @param documentType - Type of document to regenerate
   * @param request - Updated privilege request data
   * @param existingDocId - Existing document ID (will be moved to trash)
   * @param folderId - Target folder ID
   * @returns New document result
   */
  async regenerateDocument(
    documentType: 'checklist' | 'privilegesForm' | 'approvalForm',
    request: PrivilegeRequest,
    existingDocId: string,
    folderId: string
  ): Promise<DocumentResult> {
    try {
      // Move existing document to trash
      await this.driveService.trashFile(existingDocId);

      // Generate new document
      switch (documentType) {
        case 'checklist':
          return this.generateChecklist(request, folderId);
        case 'privilegesForm':
          return this.generatePrivilegesForm(request, folderId);
        case 'approvalForm':
          return this.generateApprovalForm(request, folderId);
        default:
          throw new Error(`Unknown document type: ${documentType}`);
      }
    } catch (error) {
      throw this.handleError('regenerateDocument', error);
    }
  }

  // ==========================================================================
  // Placeholder Building Methods
  // ==========================================================================

  /**
   * Build placeholders for the checklist document
   */
  private buildChecklistPlaceholders(request: PrivilegeRequest): PlaceholderData {
    const applicantPlaceholders = generateApplicantPlaceholders(request.applicant);
    const datePlaceholders = generateDatePlaceholders(request.submittedAt);

    return {
      ...applicantPlaceholders,
      ...datePlaceholders,
      request_number: request.requestNumber,
      request_id: request.id,
      hospital_center: request.hospital || this.config.hospitalName || '',
      hospital_center_ar: request.hospitalAr || this.config.hospitalNameAr || '',
      center: request.center || this.config.centerName || '',
      center_ar: request.centerAr || this.config.centerNameAr || '',
      employee_code: request.applicant.employeeCode,
      license_number: request.applicant.licenseNumber,
      license_expiry: request.applicant.licenseExpiry
        ? request.applicant.licenseExpiry.toISOString().split('T')[0]
        : '',
      years_experience: request.applicant.yearsOfExperience?.toString() || '',
      status: request.status,
      urgency: request.urgency || 'NORMAL',
      notes: request.notes || '',
      notes_ar: request.notesAr || '',
      total_privileges: request.privileges.length.toString(),
      requested_privileges: request.privileges.filter((p) => p.isRequested).length.toString(),
    };
  }

  /**
   * Build checklist-specific checkboxes
   */
  private buildChecklistCheckboxes(request: PrivilegeRequest): CheckboxData {
    const applicant = request.applicant;

    return {
      // Document checklist items
      id_copy: !!applicant.idNumber,
      scfhs_license: !!applicant.scfhsNumber,
      medical_license: !!applicant.licenseNumber,
      cv_submitted: true, // Typically required
      certificates: true,
      experience_letters: !!applicant.yearsOfExperience,
      photo: true,
      // Status checkboxes
      status_draft: request.status === 'DRAFT',
      status_pending: request.status === 'PENDING',
      status_approved: request.status === 'APPROVED',
      status_rejected: request.status === 'REJECTED',
      // Urgency checkboxes
      urgency_normal: request.urgency === 'NORMAL' || !request.urgency,
      urgency_high: request.urgency === 'HIGH',
      urgency_urgent: request.urgency === 'URGENT',
    };
  }

  /**
   * Build placeholders for the privileges form document
   */
  private buildPrivilegesFormPlaceholders(request: PrivilegeRequest): PlaceholderData {
    const basePlaceholders = this.buildChecklistPlaceholders(request);

    // Add privilege-specific placeholders
    const privilegesByCategory = this.groupPrivilegesByCategory(request.privileges);
    const categoryPlaceholders: PlaceholderData = {};

    for (const [category, privileges] of Object.entries(privilegesByCategory)) {
      const requested = privileges.filter((p) => p.isRequested);
      categoryPlaceholders[`${category.toLowerCase()}_count`] = requested.length.toString();
      categoryPlaceholders[`${category.toLowerCase()}_list`] = requested
        .map((p) => p.nameEn)
        .join(', ');
      categoryPlaceholders[`${category.toLowerCase()}_list_ar`] = requested
        .map((p) => p.nameAr)
        .join('، ');
    }

    return {
      ...basePlaceholders,
      ...categoryPlaceholders,
    };
  }

  /**
   * Build privilege checkboxes based on requested privileges
   */
  private buildPrivilegeCheckboxes(request: PrivilegeRequest): CheckboxData {
    const checkboxes: CheckboxData = {};

    for (const privilege of request.privileges) {
      // Create checkbox entries for each privilege by code
      checkboxes[`privilege_${privilege.code}`] = privilege.isRequested;
      checkboxes[`priv_${privilege.id}`] = privilege.isRequested;

      // Also create by category and index for template flexibility
      const categoryKey = privilege.category.toLowerCase();
      if (!checkboxes[`has_${categoryKey}`]) {
        checkboxes[`has_${categoryKey}`] = privilege.isRequested;
      } else if (privilege.isRequested) {
        checkboxes[`has_${categoryKey}`] = true;
      }

      // Supervision checkbox
      if (privilege.requiresSupervision) {
        checkboxes[`supervision_${privilege.code}`] = true;
      }
    }

    return checkboxes;
  }

  /**
   * Build placeholders for the approval form document
   */
  private buildApprovalFormPlaceholders(request: PrivilegeRequest): PlaceholderData {
    const basePlaceholders = this.buildChecklistPlaceholders(request);

    // Add approval-specific placeholders
    const requestedPrivileges = request.privileges.filter((p) => p.isRequested);

    return {
      ...basePlaceholders,
      privileges_summary: this.buildPrivilegesSummary(requestedPrivileges),
      privileges_summary_ar: this.buildPrivilegesSummaryAr(requestedPrivileges),
      // Approval signature placeholders (to be filled manually)
      approver_name: '',
      approver_name_ar: '',
      approver_title: '',
      approver_title_ar: '',
      approval_date: '',
      approval_comments: '',
    };
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  private groupPrivilegesByCategory(
    privileges: PrivilegeItem[]
  ): Record<string, PrivilegeItem[]> {
    return privileges.reduce(
      (acc, privilege) => {
        const category = privilege.category;
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(privilege);
        return acc;
      },
      {} as Record<string, PrivilegeItem[]>
    );
  }

  private buildPrivilegesSummary(privileges: PrivilegeItem[]): string {
    if (privileges.length === 0) {
      return 'No privileges requested';
    }

    const byCategory = this.groupPrivilegesByCategory(privileges);
    const lines: string[] = [];

    for (const [category, categoryPrivileges] of Object.entries(byCategory)) {
      lines.push(`${category}:`);
      for (const priv of categoryPrivileges) {
        const supervision = priv.requiresSupervision
          ? ` (Supervision: ${priv.supervisionDuration || 0} months)`
          : '';
        lines.push(`  - ${priv.nameEn}${supervision}`);
      }
    }

    return lines.join('\n');
  }

  private buildPrivilegesSummaryAr(privileges: PrivilegeItem[]): string {
    if (privileges.length === 0) {
      return 'لا توجد صلاحيات مطلوبة';
    }

    const byCategory = this.groupPrivilegesByCategory(privileges);
    const lines: string[] = [];

    for (const [category, categoryPrivileges] of Object.entries(byCategory)) {
      lines.push(`${category}:`);
      for (const priv of categoryPrivileges) {
        const supervision = priv.requiresSupervision
          ? ` (إشراف: ${priv.supervisionDuration || 0} شهر)`
          : '';
        lines.push(`  - ${priv.nameAr}${supervision}`);
      }
    }

    return lines.join('\n');
  }

  private handleError(operation: string, error: unknown): Error {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`DocumentGenerator.${operation} error:`, error);
    return new Error(`Document generation ${operation} failed: ${message}`);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a document generator instance from environment variables
 * Expects:
 * - GOOGLE_SERVICE_ACCOUNT_KEY
 * - CBAHI_TEMPLATE_CHECKLIST_ID
 * - CBAHI_TEMPLATE_PRIVILEGES_FORM_ID
 * - CBAHI_TEMPLATE_APPROVAL_FORM_ID
 */
export function createDocumentGenerator(
  driveService?: GoogleDriveService,
  docsService?: GoogleDocsService,
  customConfig?: Partial<DocumentGeneratorConfig>
): DocumentGenerator {
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountKey) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY environment variable is required');
  }

  const templateIds: TemplateIds = {
    checklist: customConfig?.templateIds?.checklist || process.env.CBAHI_TEMPLATE_CHECKLIST_ID || '',
    privilegesForm: customConfig?.templateIds?.privilegesForm || process.env.CBAHI_TEMPLATE_PRIVILEGES_FORM_ID || '',
    approvalForm: customConfig?.templateIds?.approvalForm || process.env.CBAHI_TEMPLATE_APPROVAL_FORM_ID || '',
  };

  if (!templateIds.checklist || !templateIds.privilegesForm || !templateIds.approvalForm) {
    throw new Error('All template IDs must be configured');
  }

  const config: DocumentGeneratorConfig = {
    templateIds,
    hospitalName: customConfig?.hospitalName || process.env.CBAHI_HOSPITAL_NAME,
    hospitalNameAr: customConfig?.hospitalNameAr || process.env.CBAHI_HOSPITAL_NAME_AR,
    centerName: customConfig?.centerName || process.env.CBAHI_CENTER_NAME,
    centerNameAr: customConfig?.centerNameAr || process.env.CBAHI_CENTER_NAME_AR,
    generatePdfs: customConfig?.generatePdfs ?? true,
    uploadPdfsToFolder: customConfig?.uploadPdfsToFolder ?? true,
  };

  const drive = driveService || new GoogleDriveService(serviceAccountKey);
  const docs = docsService || new GoogleDocsService(serviceAccountKey);

  return new DocumentGenerator(drive, docs, config);
}

// ============================================================================
// Exports
// ============================================================================

export type {
  DriveFile,
  EmployeeFolderInfo,
  RequestFolderInfo,
};
