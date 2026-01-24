/**
 * CBAHI Clinical Privileges - File Delete API
 *
 * DELETE - Delete file from Google Drive
 *          Removes file from Drive and database record
 * GET    - Get file info
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { createGoogleDriveService } from "@/lib/google-drive";
import { UserRole } from "@prisma/client";

// ============================================================================
// DELETE - Delete File
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const session = await getServerSession();

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
        role: true,
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

    const { fileId } = await params;

    if (!fileId) {
      return NextResponse.json(
        { error: "Missing file ID", message: "File ID is required" },
        { status: 400 }
      );
    }

    // Check if we have an attachment record for this file
    const attachment = await prisma.attachment.findFirst({
      where: { driveFileId: fileId },
      include: {
        request: {
          select: {
            id: true,
            applicantId: true,
            status: true,
          },
        },
      },
    });

    // If attachment exists, verify user has permission to delete
    if (attachment) {
      const isApplicant = attachment.request?.applicantId === user.id;
      const isAdmin = user.role === UserRole.ADMIN;

      if (!isApplicant && !isAdmin) {
        return NextResponse.json(
          {
            error: "Forbidden",
            message: "You do not have permission to delete this file",
          },
          { status: 403 }
        );
      }

      // Don't allow deletion if request is already submitted (not draft)
      if (
        attachment.request?.status &&
        attachment.request.status !== "DRAFT"
      ) {
        return NextResponse.json(
          {
            error: "Cannot delete",
            message: "Cannot delete files from submitted requests",
          },
          { status: 400 }
        );
      }
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

    // Delete file from Google Drive
    try {
      await driveService.deleteFile(fileId);
    } catch (error) {
      console.error("Failed to delete file from Google Drive:", error);
      // If file doesn't exist in Drive, continue to clean up database record
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      if (!errorMessage.includes("File not found") && !errorMessage.includes("404")) {
        return NextResponse.json(
          {
            error: "Delete failed",
            message: "Failed to delete file from Google Drive",
          },
          { status: 500 }
        );
      }
    }

    // Delete attachment record from database if exists
    if (attachment) {
      await prisma.attachment.delete({
        where: { id: attachment.id },
      });
    }

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "DELETE_FILE",
        entityType: "attachments",
        entityId: fileId,
        oldValues: attachment
          ? {
              fileName: attachment.fileName,
              mimeType: attachment.mimeType,
              fileSize: attachment.fileSize,
              driveFileId: attachment.driveFileId,
              requestId: attachment.requestId,
            }
          : { driveFileId: fileId },
      },
    });

    return NextResponse.json({
      success: true,
      message: "File deleted successfully",
      data: {
        fileId,
        deleted: true,
      },
    });
  } catch (error) {
    console.error("DELETE /api/uploads/[fileId] error:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Failed to delete file",
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET - Get File Info
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Please sign in to continue" },
        { status: 401 }
      );
    }

    const { fileId } = await params;

    if (!fileId) {
      return NextResponse.json(
        { error: "Missing file ID", message: "File ID is required" },
        { status: 400 }
      );
    }

    // Check database for attachment info
    const attachment = await prisma.attachment.findFirst({
      where: { driveFileId: fileId },
    });

    if (attachment) {
      return NextResponse.json({
        success: true,
        data: {
          id: attachment.id,
          driveFileId: attachment.driveFileId,
          name: attachment.fileName,
          type: attachment.mimeType,
          size: attachment.fileSize,
          url: attachment.driveFileUrl,
          documentType: attachment.type,
          uploadedAt: attachment.uploadedAt,
        },
      });
    }

    // If no database record, try to get info from Google Drive
    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKey) {
      return NextResponse.json(
        { error: "File not found", message: "File information not available" },
        { status: 404 }
      );
    }

    try {
      const driveService = createGoogleDriveService({
        rootFolderName: "CBAHI Clinical Privileges",
        rootFolderId: process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID,
      });

      const driveFile = await driveService.getFile(fileId);

      return NextResponse.json({
        success: true,
        data: {
          id: driveFile.id,
          driveFileId: driveFile.id,
          name: driveFile.name,
          type: driveFile.mimeType,
          url: driveFile.webViewLink,
          createdAt: driveFile.createdTime,
        },
      });
    } catch (error) {
      console.error("Failed to get file from Google Drive:", error);
      return NextResponse.json(
        { error: "File not found", message: "File not found" },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("GET /api/uploads/[fileId] error:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Failed to get file info",
      },
      { status: 500 }
    );
  }
}
