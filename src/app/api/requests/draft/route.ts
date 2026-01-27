/**
 * CBAHI Clinical Privileges - Draft Request API
 *
 * POST - Create a new draft request
 * PUT  - Update an existing draft request
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { RequestStatus, RequestType, PrivilegeRequestType } from "@prisma/client";

// ============================================================================
// Helper: Convert frontend privilege IDs to database IDs
// ============================================================================

async function getPrivilegeDbIds(frontendIds: string[]): Promise<string[]> {
  if (!frontendIds || frontendIds.length === 0) return [];
  
  // Frontend sends IDs like 'core-001', convert to codes like 'CORE-001'
  const privilegeCodes = frontendIds.map(id => id.toUpperCase());
  
  const privileges = await prisma.privilege.findMany({
    where: {
      code: { in: privilegeCodes },
      isActive: true,
    },
    select: { id: true },
  });
  
  return privileges.map(p => p.id);
}

// ============================================================================
// Types
// ============================================================================

interface DraftRequestBody {
  id?: string;
  personalInfo?: {
    nameEn?: string;
    nameAr?: string;
    employeeCode?: string;
    department?: string;
    departmentAr?: string;
    jobTitle?: string;
    jobTitleAr?: string;
    location?: string;
    locationAr?: string;
    email?: string;
    scfhsNumber?: string;
    hospitalCenter?: string;
  };
  applicationType?: {
    applicationType?: "new" | "reapplication";
    reapplicationReason?: string;
  };
  privileges?: {
    selectedPrivileges?: string[];
  };
  documents?: Record<string, unknown>;
}

// ============================================================================
// POST - Create New Draft
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
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found", message: "User profile not found" },
        { status: 404 }
      );
    }

    const body: DraftRequestBody = await request.json();

    // Map application type to RequestType enum
    const requestType =
      body.applicationType?.applicationType === "reapplication"
        ? RequestType.REAPPLICATION
        : RequestType.NEW;

    // Convert frontend privilege IDs to database IDs
    const privilegeDbIds = await getPrivilegeDbIds(
      body.privileges?.selectedPrivileges || []
    );

    // Create draft request
    const draft = await prisma.privilegeRequest.create({
      data: {
        applicantId: user.id,
        type: requestType,
        requestType: PrivilegeRequestType.CORE, // Default, will be updated based on privileges
        reapplicationReason: body.applicationType?.reapplicationReason,
        hospitalCenter: body.personalInfo?.hospitalCenter,
        status: RequestStatus.DRAFT,
        // Create privileges with validated database IDs
        requestedPrivileges: privilegeDbIds.length > 0
          ? {
              createMany: {
                data: privilegeDbIds.map((privilegeId) => ({
                  privilegeId,
                })),
              },
            }
          : undefined,
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      id: draft.id,
      status: draft.status,
      createdAt: draft.createdAt,
      message: "Draft saved successfully",
    });
  } catch (error) {
    console.error("POST /api/requests/draft error:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Failed to save draft",
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// PUT - Update Existing Draft
// ============================================================================

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Please sign in to continue" },
        { status: 401 }
      );
    }

    const body: DraftRequestBody = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { error: "Bad Request", message: "Draft ID is required" },
        { status: 400 }
      );
    }

    // Verify ownership
    const existingDraft = await prisma.privilegeRequest.findUnique({
      where: { id: body.id },
      select: { id: true, applicantId: true, status: true },
    });

    if (!existingDraft) {
      return NextResponse.json(
        { error: "Not Found", message: "Draft not found" },
        { status: 404 }
      );
    }

    if (existingDraft.applicantId !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden", message: "You cannot edit this draft" },
        { status: 403 }
      );
    }

    if (existingDraft.status !== RequestStatus.DRAFT) {
      return NextResponse.json(
        { error: "Bad Request", message: "Only drafts can be updated" },
        { status: 400 }
      );
    }

    // Map application type to RequestType enum
    const requestType =
      body.applicationType?.applicationType === "reapplication"
        ? RequestType.REAPPLICATION
        : RequestType.NEW;

    // Convert frontend privilege IDs to database IDs
    const privilegeDbIds = await getPrivilegeDbIds(
      body.privileges?.selectedPrivileges || []
    );

    // Update draft in a transaction
    const draft = await prisma.$transaction(async (tx) => {
      // Delete existing privileges if we're updating them
      if (body.privileges?.selectedPrivileges !== undefined) {
        await tx.requestedPrivilege.deleteMany({
          where: { requestId: body.id },
        });
      }

      // Update the draft
      const updated = await tx.privilegeRequest.update({
        where: { id: body.id },
        data: {
          type: requestType,
          reapplicationReason: body.applicationType?.reapplicationReason,
          hospitalCenter: body.personalInfo?.hospitalCenter,
          updatedAt: new Date(),
          // Re-create privileges with validated database IDs
          requestedPrivileges: privilegeDbIds.length > 0
            ? {
                createMany: {
                  data: privilegeDbIds.map((privilegeId) => ({
                    privilegeId,
                  })),
                },
              }
            : undefined,
        },
        select: {
          id: true,
          status: true,
          updatedAt: true,
        },
      });

      return updated;
    });

    return NextResponse.json({
      id: draft.id,
      status: draft.status,
      updatedAt: draft.updatedAt,
      message: "Draft updated successfully",
    });
  } catch (error) {
    console.error("PUT /api/requests/draft error:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Failed to update draft",
      },
      { status: 500 }
    );
  }
}
