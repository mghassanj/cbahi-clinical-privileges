/**
 * CBAHI Clinical Privileges - Document Generation API
 *
 * POST - Generate documents for approved request
 *        Triggers Google Docs/Drive integration
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { RequestStatus, UserRole } from "@prisma/client";
import { createGoogleDriveService } from "@/lib/google-drive";

// ============================================================================
// Types
// ============================================================================

interface GenerateDocumentsBody {
  requestId: string;
  documents?: ("checklist" | "privileges_form" | "approval_form")[];
  regenerate?: boolean;
}

interface DocumentResult {
  type: string;
  docId?: string;
  pdfUrl?: string;
  webViewLink?: string;
  status: "success" | "error" | "skipped";
  message?: string;
}

// ============================================================================
// POST - Generate Documents
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Please sign in to continue" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, nameEn: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found", message: "User profile not found" },
        { status: 404 }
      );
    }

    const body: GenerateDocumentsBody = await request.json();

    if (!body.requestId) {
      return NextResponse.json(
        { error: "Invalid request", message: "requestId is required" },
        { status: 400 }
      );
    }

    // Get the privilege request
    const privilegeRequest = await prisma.privilegeRequest.findUnique({
      where: { id: body.requestId },
      include: {
        applicant: {
          select: {
            id: true,
            nameEn: true,
            nameAr: true,
            email: true,
            employeeCode: true,
            departmentEn: true,
            departmentAr: true,
            jobTitleEn: true,
            jobTitleAr: true,
            scfhsNo: true,
            joiningDate: true,
            nationalityEn: true,
          },
        },
        requestedPrivileges: {
          include: {
            privilege: true,
          },
          where: {
            status: "APPROVED",
          },
        },
        approvals: {
          include: {
            approver: {
              select: {
                id: true,
                nameEn: true,
                nameAr: true,
                role: true,
                jobTitleEn: true,
              },
            },
          },
          where: {
            status: "APPROVED",
          },
          orderBy: { approvedAt: "asc" },
        },
      },
    });

    if (!privilegeRequest) {
      return NextResponse.json(
        { error: "Not found", message: "Privilege request not found" },
        { status: 404 }
      );
    }

    // Check permissions
    const canGenerate =
      user.role === UserRole.ADMIN ||
      user.role === UserRole.MEDICAL_DIRECTOR ||
      privilegeRequest.applicantId === user.id;

    if (!canGenerate) {
      return NextResponse.json(
        {
          error: "Forbidden",
          message: "You do not have permission to generate documents for this request",
        },
        { status: 403 }
      );
    }

    // Only generate documents for approved requests
    if (privilegeRequest.status !== RequestStatus.APPROVED) {
      return NextResponse.json(
        {
          error: "Invalid status",
          message: "Documents can only be generated for approved requests",
        },
        { status: 400 }
      );
    }

    // Check if documents already exist and regenerate is not requested
    if (
      !body.regenerate &&
      privilegeRequest.checklistDocId &&
      privilegeRequest.privilegesFormDocId &&
      privilegeRequest.approvalFormDocId
    ) {
      return NextResponse.json({
        message: "Documents already generated",
        data: {
          checklist: {
            docId: privilegeRequest.checklistDocId,
            pdfUrl: privilegeRequest.checklistPdfUrl,
          },
          privilegesForm: {
            docId: privilegeRequest.privilegesFormDocId,
            pdfUrl: privilegeRequest.privilegesFormPdfUrl,
          },
          approvalForm: {
            docId: privilegeRequest.approvalFormDocId,
            pdfUrl: privilegeRequest.approvalFormPdfUrl,
          },
          driveFolder: privilegeRequest.driveFolderId,
        },
      });
    }

    // Get system settings for Google integration
    const settings = await prisma.systemSettings.findUnique({
      where: { id: "default" },
      select: {
        googleServiceAccountKey: true,
        googleDriveRootFolderId: true,
        googleDocsTemplates: true,
      },
    });

    if (!settings?.googleServiceAccountKey) {
      return NextResponse.json(
        {
          error: "Google not configured",
          message: "Google Drive integration is not configured. Please contact administrator.",
        },
        { status: 400 }
      );
    }

    // Initialize Google Drive service
    let driveService;
    try {
      driveService = createGoogleDriveService({
        rootFolderName: "CBAHI Clinical Privileges",
        rootFolderId: settings.googleDriveRootFolderId || undefined,
      });
    } catch (error) {
      console.error("Failed to initialize Google Drive service:", error);
      return NextResponse.json(
        {
          error: "Google Drive error",
          message: "Failed to connect to Google Drive",
        },
        { status: 500 }
      );
    }

    // Determine which documents to generate
    const documentsToGenerate = body.documents || [
      "checklist",
      "privileges_form",
      "approval_form",
    ];

    const results: DocumentResult[] = [];

    // Create or get employee folder
    let employeeFolder;
    try {
      employeeFolder = await driveService.createEmployeeFolder(
        privilegeRequest.applicant.nameEn,
        privilegeRequest.applicant.employeeCode || privilegeRequest.applicant.id
      );
    } catch (error) {
      console.error("Failed to create employee folder:", error);
      return NextResponse.json(
        {
          error: "Folder creation failed",
          message: "Failed to create folder in Google Drive",
        },
        { status: 500 }
      );
    }

    // Create request folder
    let requestFolder;
    try {
      const requestNumber = `${new Date().getFullYear()}_${privilegeRequest.id.slice(-6)}`;
      requestFolder = await driveService.createRequestFolder(
        employeeFolder.folderId,
        requestNumber
      );
    } catch (error) {
      console.error("Failed to create request folder:", error);
      return NextResponse.json(
        {
          error: "Folder creation failed",
          message: "Failed to create request folder in Google Drive",
        },
        { status: 500 }
      );
    }

    // Update request with folder ID
    await prisma.privilegeRequest.update({
      where: { id: body.requestId },
      data: {
        driveFolderId: requestFolder.folderId,
      },
    });

    // Generate each requested document
    for (const docType of documentsToGenerate) {
      try {
        const result = await generateDocument(
          driveService,
          docType,
          privilegeRequest,
          requestFolder.folderId,
          settings.googleDocsTemplates as Record<string, string> | null
        );
        results.push(result);

        // Update request with document IDs
        if (result.status === "success") {
          const updateData: Record<string, string | undefined> = {};
          switch (docType) {
            case "checklist":
              updateData.checklistDocId = result.docId;
              updateData.checklistPdfUrl = result.pdfUrl;
              break;
            case "privileges_form":
              updateData.privilegesFormDocId = result.docId;
              updateData.privilegesFormPdfUrl = result.pdfUrl;
              break;
            case "approval_form":
              updateData.approvalFormDocId = result.docId;
              updateData.approvalFormPdfUrl = result.pdfUrl;
              break;
          }

          await prisma.privilegeRequest.update({
            where: { id: body.requestId },
            data: updateData,
          });
        }
      } catch (error) {
        console.error(`Failed to generate ${docType}:`, error);
        results.push({
          type: docType,
          status: "error",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "GENERATE_DOCUMENTS",
        entityType: "privilege_requests",
        entityId: body.requestId,
        newValues: {
          documents: documentsToGenerate,
          results: results.map((r) => ({
            type: r.type,
            status: r.status,
          })),
          folderId: requestFolder.folderId,
        },
      },
    });

    const hasErrors = results.some((r) => r.status === "error");
    const allSkipped = results.every((r) => r.status === "skipped");

    return NextResponse.json({
      message: hasErrors
        ? "Document generation completed with errors"
        : allSkipped
        ? "All documents already exist"
        : "Documents generated successfully",
      data: {
        folderId: requestFolder.folderId,
        folderUrl: requestFolder.webViewLink,
        documents: results,
      },
    });
  } catch (error) {
    console.error("POST /api/documents error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to generate documents" },
      { status: 500 }
    );
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

interface PrivilegeRequestWithRelations {
  id: string;
  type: string;
  requestType: string;
  hospitalCenter: string | null;
  currentJob: string | null;
  submittedAt: Date | null;
  completedAt: Date | null;
  applicant: {
    id: string;
    nameEn: string;
    nameAr: string | null;
    email: string;
    employeeCode: string | null;
    departmentEn: string | null;
    departmentAr: string | null;
    jobTitleEn: string | null;
    jobTitleAr: string | null;
    scfhsNo: string | null;
    joiningDate: Date | null;
    nationalityEn: string | null;
  };
  requestedPrivileges: Array<{
    id: string;
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
    approvedAt: Date | null;
    approver: {
      id: string;
      nameEn: string;
      nameAr: string | null;
      role: string;
      jobTitleEn: string | null;
    };
  }>;
}

/**
 * Generate a specific document type
 */
async function generateDocument(
  driveService: ReturnType<typeof createGoogleDriveService>,
  docType: string,
  request: PrivilegeRequestWithRelations,
  folderId: string,
  templates: Record<string, string> | null
): Promise<DocumentResult> {
  // Check if template exists
  const templateId = templates?.[docType];

  if (!templateId) {
    // Generate document without template (create from scratch)
    return await generateDocumentFromScratch(
      driveService,
      docType,
      request,
      folderId
    );
  }

  try {
    // Copy template
    const docName = `${docType}_${request.applicant.nameEn}_${request.id.slice(-6)}`;
    const copiedDoc = await driveService.copyFile(templateId, docName, folderId);

    // Note: In production, you would use Google Docs API to replace placeholders
    // with actual data from the request

    // Export as PDF
    const pdfBuffer = await driveService.exportAsPdf(copiedDoc.id);

    // Upload PDF
    const pdfName = `${docName}.pdf`;
    const pdfFile = await driveService.uploadFile(
      folderId,
      pdfName,
      "application/pdf",
      pdfBuffer
    );

    // Set permissions for viewing
    await driveService.setFilePermissions(pdfFile.id, "reader");

    return {
      type: docType,
      docId: copiedDoc.id,
      pdfUrl: pdfFile.webViewLink,
      webViewLink: copiedDoc.webViewLink,
      status: "success",
    };
  } catch (error) {
    console.error(`Error generating ${docType} from template:`, error);
    throw error;
  }
}

/**
 * Generate document from scratch (no template)
 * This creates a simple placeholder document
 */
async function generateDocumentFromScratch(
  driveService: ReturnType<typeof createGoogleDriveService>,
  docType: string,
  request: PrivilegeRequestWithRelations,
  folderId: string
): Promise<DocumentResult> {
  // Generate document content based on type
  let content: string;
  const docName = `${docType}_${request.applicant.nameEn}_${request.id.slice(-6)}`;

  switch (docType) {
    case "checklist":
      content = generateChecklistContent(request);
      break;
    case "privileges_form":
      content = generatePrivilegesFormContent(request);
      break;
    case "approval_form":
      content = generateApprovalFormContent(request);
      break;
    default:
      throw new Error(`Unknown document type: ${docType}`);
  }

  // Upload as text file (in production, you'd create a proper Google Doc)
  const textFile = await driveService.uploadFile(
    folderId,
    `${docName}.txt`,
    "text/plain",
    Buffer.from(content, "utf-8")
  );

  await driveService.setFilePermissions(textFile.id, "reader");

  return {
    type: docType,
    docId: textFile.id,
    webViewLink: textFile.webViewLink,
    status: "success",
    message: "Generated without template",
  };
}

function generateChecklistContent(request: PrivilegeRequestWithRelations): string {
  return `
CBAHI Clinical Privileges Management System
Document Submission Checklist
========================================

Applicant Information
---------------------
Name: ${request.applicant.nameEn}
Employee Code: ${request.applicant.employeeCode || "N/A"}
Department: ${request.applicant.departmentEn || "N/A"}
Job Title: ${request.applicant.jobTitleEn || "N/A"}
SCFHS No: ${request.applicant.scfhsNo || "N/A"}

Request Information
-------------------
Request Type: ${request.type}
Privilege Type: ${request.requestType}
Hospital/Center: ${request.hospitalCenter || "N/A"}
Submitted: ${request.submittedAt?.toISOString() || "N/A"}

Required Documents
------------------
[ ] CV/Resume
[ ] Medical License
[ ] SCFHS License
[ ] Board Certificate
[ ] Specialty Certificate(s)
[ ] Experience Letters
[ ] Training Certificates

Generated: ${new Date().toISOString()}
  `.trim();
}

function generatePrivilegesFormContent(request: PrivilegeRequestWithRelations): string {
  const privilegesList = request.requestedPrivileges
    .map((rp) => `- ${rp.privilege.code}: ${rp.privilege.nameEn} (${rp.privilege.category})`)
    .join("\n");

  return `
CBAHI Clinical Privileges Management System
Approved Clinical Privileges
========================================

Applicant Information
---------------------
Name: ${request.applicant.nameEn}
Employee Code: ${request.applicant.employeeCode || "N/A"}
Department: ${request.applicant.departmentEn || "N/A"}
SCFHS No: ${request.applicant.scfhsNo || "N/A"}

Approved Privileges
-------------------
${privilegesList || "No privileges approved"}

Total Privileges: ${request.requestedPrivileges.length}

Approval Date: ${request.completedAt?.toISOString() || "N/A"}

Generated: ${new Date().toISOString()}
  `.trim();
}

function generateApprovalFormContent(request: PrivilegeRequestWithRelations): string {
  const approvalsList = request.approvals
    .map(
      (a) =>
        `- ${a.level}: ${a.approver.nameEn} (${a.approver.jobTitleEn || a.approver.role}) - ${a.approvedAt?.toISOString() || "Pending"}`
    )
    .join("\n");

  return `
CBAHI Clinical Privileges Management System
Approval Summary
========================================

Applicant Information
---------------------
Name: ${request.applicant.nameEn}
Employee Code: ${request.applicant.employeeCode || "N/A"}
Department: ${request.applicant.departmentEn || "N/A"}

Request Details
---------------
Request Type: ${request.type}
Privilege Type: ${request.requestType}
Submitted: ${request.submittedAt?.toISOString() || "N/A"}
Completed: ${request.completedAt?.toISOString() || "N/A"}

Approval Chain
--------------
${approvalsList || "No approvals recorded"}

Final Status: APPROVED

Generated: ${new Date().toISOString()}
  `.trim();
}
