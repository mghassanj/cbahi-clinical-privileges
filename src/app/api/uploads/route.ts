/**
 * CBAHI Clinical Privileges - File Upload API
 *
 * POST - Upload file to storage
 *        Accepts multipart form data
 *        Uploads to Google Drive if configured, otherwise stores locally
 *        Returns file URL and file ID
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createGoogleDriveService } from "@/lib/google-drive";
import { AttachmentType } from "@prisma/client";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

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

// Local upload directory (for when Google Drive is not configured)
const UPLOAD_DIR = process.env.UPLOAD_DIR || "/tmp/uploads";

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
// Helper Functions
// ============================================================================

async function ensureUploadDir(subDir?: string): Promise<string> {
  const targetDir = subDir ? path.join(UPLOAD_DIR, subDir) : UPLOAD_DIR;
  if (!existsSync(targetDir)) {
    await mkdir(targetDir, { recursive: true });
  }
  return targetDir;
}

async function uploadToLocalStorage(
  userId: string,
  fileName: string,
  mimeType: string,
  buffer: Buffer
): Promise<{ id: string; url: string }> {
  // Create user-specific directory
  const userDir = await ensureUploadDir(userId);

  // Generate unique filename
  const timestamp = Date.now();
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const uniqueFileName = `${timestamp}_${sanitizedName}`;
  const filePath = path.join(userDir, uniqueFileName);

  // Write file to disk
  await writeFile(filePath, buffer);

  // Generate file ID and URL
  const fileId = `local_${userId}_${timestamp}`;
  const baseUrl = process.env.APP_BASE_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
  const fileUrl = `${baseUrl}/api/uploads/${fileId}`;

  return {
    id: fileId,
    url: fileUrl,
  };
}

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

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate unique file name
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const fileName = documentType
      ? `${documentType}_${timestamp}_${sanitizedName}`
      : `${timestamp}_${sanitizedName}`;

    let uploadedFile: { id: string; url: string; webContentLink?: string };
    let storageType: "google_drive" | "local" = "local";

    // Check if Google Drive is configured
    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

    if (serviceAccountKey) {
      // Try Google Drive upload
      try {
        const driveService = createGoogleDriveService({
          rootFolderName: "CBAHI Clinical Privileges",
          rootFolderId: process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID,
        });

        // Create or get employee folder
        const employeeFolder = await driveService.createEmployeeFolder(
          user.nameEn,
          user.employeeCode || user.id
        );

        // Create attachments folder within employee folder
        const attachmentsFolderId = await driveService.getOrCreateFolder(
          "Attachments",
          employeeFolder.folderId
        );

        // Upload to Google Drive
        const driveFile = await driveService.uploadFile(
          attachmentsFolderId,
          fileName,
          file.type,
          buffer
        );

        // Set file permissions to allow viewing
        try {
          await driveService.setFilePermissions(driveFile.id, "reader");
        } catch (permError) {
          console.error("Failed to set file permissions:", permError);
        }

        uploadedFile = {
          id: driveFile.id,
          url: driveFile.webViewLink,
          webContentLink: driveFile.webContentLink,
        };
        storageType = "google_drive";
      } catch (driveError) {
        console.error("Google Drive upload failed, falling back to local storage:", driveError);
        // Fall back to local storage
        uploadedFile = await uploadToLocalStorage(user.id, fileName, file.type, buffer);
      }
    } else {
      // Use local storage
      uploadedFile = await uploadToLocalStorage(user.id, fileName, file.type, buffer);
    }

    // If requestId is provided, create an attachment record
    if (requestId) {
      try {
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
            driveFileUrl: uploadedFile.url,
            type: attachmentType,
          },
        });
      } catch (error) {
        console.error("Failed to create attachment record:", error);
        // Continue anyway - file is uploaded
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
          fileId: uploadedFile.id,
          documentType,
          requestId,
          storageType,
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
        url: uploadedFile.url,
        webContentLink: uploadedFile.webContentLink,
        storageType,
        createdTime: new Date().toISOString(),
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
