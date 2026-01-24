/**
 * CBAHI Clinical Privileges - Test Google Connection API
 *
 * POST - Test Google Drive connection and service account configuration
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UserRole } from "@prisma/client";
import { GoogleDriveService } from "@/lib/google-drive";

// ============================================================================
// POST - Test Google Connection
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
      select: { id: true, role: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found", message: "User profile not found" },
        { status: 404 }
      );
    }

    // Only admins can test Google connection
    if (user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        {
          error: "Forbidden",
          message: "Only administrators can test Google connection",
        },
        { status: 403 }
      );
    }

    // Get request body (optional - can override env vars for testing)
    const body = await request.json().catch(() => ({}));

    // Get service account credentials from environment or request body
    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

    if (!serviceAccountKey && !body.privateKey) {
      return NextResponse.json(
        {
          error: "Configuration missing",
          message: "Google service account key is not configured",
        },
        { status: 400 }
      );
    }

    try {
      // Try to initialize the service and verify connection
      let driveService: GoogleDriveService;

      if (body.privateKey && body.serviceAccountEmail) {
        // Use provided credentials for testing
        const credentials = {
          type: "service_account",
          project_id: "cbahi-project",
          private_key_id: "",
          private_key: body.privateKey,
          client_email: body.serviceAccountEmail,
          client_id: "",
          auth_uri: "https://accounts.google.com/o/oauth2/auth",
          token_uri: "https://oauth2.googleapis.com/token",
          auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
          client_x509_cert_url: "",
        };
        driveService = new GoogleDriveService(credentials, {
          rootFolderName: "CBAHI Clinical Privileges",
          rootFolderId: body.driveFolderId,
        });
      } else {
        // Use environment credentials
        driveService = new GoogleDriveService(serviceAccountKey!, {
          rootFolderName: "CBAHI Clinical Privileges",
          rootFolderId: body.driveFolderId || process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID,
        });
      }

      // Test the connection by initializing folder structure
      const folderStructure = await driveService.initializeFolderStructure();

      // Log the successful test
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "GOOGLE_CONNECTION_TEST",
          entityType: "google",
          newValues: {
            success: true,
            rootFolderId: folderStructure.rootFolderId,
          },
        },
      });

      return NextResponse.json({
        success: true,
        message: "Google Drive connection successful",
        data: {
          rootFolderId: folderStructure.rootFolderId,
          employeesFolderId: folderStructure.employeesFolderId,
          templatesFolderId: folderStructure.templatesFolderId,
        },
      });
    } catch (driveError) {
      // Log the failed test
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "GOOGLE_CONNECTION_TEST",
          entityType: "google",
          newValues: {
            success: false,
            error: driveError instanceof Error ? driveError.message : "Unknown error",
          },
        },
      });

      return NextResponse.json(
        {
          error: "Connection failed",
          message: driveError instanceof Error ? driveError.message : "Failed to connect to Google Drive",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("POST /api/google/test error:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Failed to test Google connection",
      },
      { status: 500 }
    );
  }
}
