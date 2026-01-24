/**
 * CBAHI Clinical Privileges - File Upload API
 *
 * POST - Upload file to Google Drive
 *        Accepts multipart form data, uploads to Google Drive
 *        Returns file URL and Drive file ID
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createGoogleDriveService } from "@/lib/google-drive";
import { AttachmentType } from "@prisma/client";

// ============================================================================
// Constants
// ============================================================================

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

// Map document types to AttachmentType enum
const DOCUMENT_TYPE_MAP: Record<string, AttachmentType> = {
  educationCertificate: AttachmentType.BOARD_CERTIFICATE,
  scfhsRegistration: AttachmentType.SCFHS_LICENSE,
  nationalIdCopy: AttachmentType.OTHER,
  passportPhoto: AttachmentType.OTHER,
  additionalCertifications: AttachmentType.SPECIALTY_CERTIFICATE,
  cvResume: AttachmentType.CV,
  cv: AttachmentType.CV,
  medicalLicense: AttachmentType.MEDICAL_LICENSE,
  boardCertificate: AttachmentType.BOARD_CERTIFICATE,
  specialtyCertificate: AttachmentType.SPECIALTY_CERTIFICATE,
  experienceLetter: AttachmentType.EXPERIENCE_LETTER,
  trainingCertificate: AttachmentType.TRAINING_CERTIFICATE,
};

// ============================================================================
// POST - Upload File
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
      select: {
        id: true,
        nameEn: true,
        employeeCode: true,
        isActive: true,
        status: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found", message: "User profile not found" },
        { status: 404 }
      );
    }

    if (!user.isActive || user.status !== "ACTIVE") {
      return NextResponse.json(
        {
          error: "Account inactive",
          message: "Your account is not active. Please contact administrator.",
        },
        { status: 403 }
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const documentType = formData.get("documentType") as string | null;
    const requestId = formData.get("requestId") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided", message: "Please select a file to upload" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: "Invalid file type",
          message: `File type ${file.type} is not allowed. Allowed types: PDF, JPEG, PNG, GIF, DOC, DOCX`,
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: "File too large",
          message: `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        },
        { status: 400 }
      );
    }

    // Check if Google Drive is configured
    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKey) {
      return NextResponse.json(
        {
          error: "Google Drive not configured",
          message: "Google Drive integration is not configured. Please contact administrator.",
        },
        { status: 500 }
      );
    }

    // Initialize Google Drive service
    let driveService;
    try {
      driveService = createGoogleDriveService({
        rootFolderName: "CBAHI Clinical Privileges",
        rootFolderId: process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID,
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

    // Create or get employee folder
    let employeeFolder;
    try {
      employeeFolder = await driveService.createEmployeeFolder(
        user.nameEn,
        user.employeeCode || user.id
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

    // Create attachments folder within employee folder
    let attachmentsFolderId: string;
    try {
      attachmentsFolderId = await driveService.getOrCreateFolder(
        "Attachments",
        employeeFolder.folderId
      );
    } catch (error) {
      console.error("Failed to create attachments folder:", error);
      return NextResponse.json(
        {
          error: "Folder creation failed",
          message: "Failed to create attachments folder",
        },
        { status: 500 }
      );
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate unique file name
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const fileName = documentType
      ? `${documentType}_${timestamp}_${sanitizedName}`
      : `${timestamp}_${sanitizedName}`;

    // Upload to Google Drive
    let uploadedFile;
    try {
      uploadedFile = await driveService.uploadFile(
        attachmentsFolderId,
        fileName,
        file.type,
        buffer
      );
    } catch (error) {
      console.error("Failed to upload file to Google Drive:", error);
      return NextResponse.json(
        {
          error: "Upload failed",
          message: "Failed to upload file to Google Drive",
        },
        { status: 500 }
      );
    }

    // Set file permissions to allow viewing
    try {
      await driveService.setFilePermissions(uploadedFile.id, "reader");
    } catch (error) {
      console.error("Failed to set file permissions:", error);
      // Continue anyway - file is uploaded but may not be publicly accessible
    }

    // If requestId is provided, create an attachment record
    if (requestId) {
      try {
        // Map the document type string to the AttachmentType enum
        const attachmentType = documentType
          ? DOCUMENT_TYPE_MAP[documentType] || AttachmentType.OTHER
          : AttachmentType.OTHER;

        await prisma.attachment.create({
          data: {
            requestId,
            fileName: file.name,
            mimeType: file.type,
            fileSize: file.size,
            driveFileId: uploadedFile.id,
            driveFileUrl: uploadedFile.webViewLink,
            type: attachmentType,
          },
        });
      } catch (error) {
        console.error("Failed to create attachment record:", error);
        // Continue anyway - file is uploaded to Drive
      }
    }

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "UPLOAD_FILE",
        entityType: "attachments",
        entityId: uploadedFile.id,
        newValues: {
          fileName: file.name,
          mimeType: file.type,
          fileSize: file.size,
          driveFileId: uploadedFile.id,
          documentType,
          requestId,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "File uploaded successfully",
      data: {
        id: uploadedFile.id,
        driveFileId: uploadedFile.id,
        name: file.name,
        type: file.type,
        size: file.size,
        url: uploadedFile.webViewLink,
        webContentLink: uploadedFile.webContentLink,
        createdTime: uploadedFile.createdTime,
      },
    });
  } catch (error) {
    console.error("POST /api/uploads error:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Failed to upload file",
      },
      { status: 500 }
    );
  }
}
