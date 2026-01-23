/**
 * CBAHI Clinical Privileges - Single Request API
 *
 * GET    - Get request details with privileges, approvals, attachments
 * PATCH  - Update request (only if draft or returned for modifications)
 * DELETE - Delete draft request
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import {
  RequestStatus,
  RequestType,
  PrivilegeRequestType,
  UserRole,
} from "@prisma/client";

// ============================================================================
// Types
// ============================================================================

interface UpdateRequestBody {
  type?: RequestType;
  requestType?: PrivilegeRequestType;
  reapplicationReason?: string;
  hospitalCenter?: string;
  currentJob?: string;
  privileges?: string[]; // Array of privilege IDs to replace existing
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ============================================================================
// GET - Get Request Details
// ============================================================================

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Please sign in to continue" },
        { status: 401 }
      );
    }

    const { id } = await params;

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

    const privilegeRequest = await prisma.privilegeRequest.findUnique({
      where: { id },
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
            nationalityAr: true,
            locationEn: true,
            locationAr: true,
          },
        },
        requestedPrivileges: {
          include: {
            privilege: {
              select: {
                id: true,
                code: true,
                nameEn: true,
                nameAr: true,
                category: true,
                description: true,
                requiresSpecialQualification: true,
              },
            },
          },
        },
        approvals: {
          include: {
            approver: {
              select: {
                id: true,
                nameEn: true,
                nameAr: true,
                email: true,
                role: true,
                jobTitleEn: true,
                jobTitleAr: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        attachments: {
          select: {
            id: true,
            type: true,
            fileName: true,
            fileSize: true,
            mimeType: true,
            driveFileUrl: true,
            uploadedAt: true,
          },
          orderBy: { uploadedAt: "desc" },
        },
        escalations: {
          include: {
            approver: {
              select: {
                id: true,
                nameEn: true,
                nameAr: true,
              },
            },
            level2Manager: {
              select: {
                id: true,
                nameEn: true,
                nameAr: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!privilegeRequest) {
      return NextResponse.json(
        { error: "Not found", message: "Privilege request not found" },
        { status: 404 }
      );
    }

    // Check access permissions
    const canView =
      user.role === UserRole.ADMIN ||
      user.role === UserRole.MEDICAL_DIRECTOR ||
      privilegeRequest.applicantId === user.id ||
      privilegeRequest.approvals.some((a) => a.approverId === user.id);

    if (!canView) {
      return NextResponse.json(
        {
          error: "Forbidden",
          message: "You do not have permission to view this request",
        },
        { status: 403 }
      );
    }

    // Add computed fields
    const currentApproval = privilegeRequest.approvals.find(
      (a) => a.status === "PENDING"
    );

    const response = {
      ...privilegeRequest,
      currentApprovalLevel: currentApproval?.level || null,
      currentApprover: currentApproval?.approver || null,
      canEdit:
        privilegeRequest.applicantId === user.id &&
        (privilegeRequest.status === RequestStatus.DRAFT ||
          privilegeRequest.status === RequestStatus.REJECTED),
      canApprove:
        currentApproval?.approverId === user.id &&
        currentApproval?.status === "PENDING",
    };

    return NextResponse.json({ data: response });
  } catch (error) {
    console.error("GET /api/requests/[id] error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to fetch request" },
      { status: 500 }
    );
  }
}

// ============================================================================
// PATCH - Update Request
// ============================================================================

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Please sign in to continue" },
        { status: 401 }
      );
    }

    const { id } = await params;

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

    const privilegeRequest = await prisma.privilegeRequest.findUnique({
      where: { id },
      select: {
        id: true,
        applicantId: true,
        status: true,
      },
    });

    if (!privilegeRequest) {
      return NextResponse.json(
        { error: "Not found", message: "Privilege request not found" },
        { status: 404 }
      );
    }

    // Check if user owns the request
    if (privilegeRequest.applicantId !== user.id && user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        {
          error: "Forbidden",
          message: "You can only update your own requests",
        },
        { status: 403 }
      );
    }

    // Check if request can be edited
    const editableStatuses: RequestStatus[] = [RequestStatus.DRAFT, RequestStatus.REJECTED];
    if (!editableStatuses.includes(privilegeRequest.status)) {
      return NextResponse.json(
        {
          error: "Not editable",
          message: `Request cannot be edited in ${privilegeRequest.status} status`,
        },
        { status: 400 }
      );
    }

    const body: UpdateRequestBody = await request.json();

    // Validate privileges if provided
    if (body.privileges && body.privileges.length > 0) {
      const privilegeCount = await prisma.privilege.count({
        where: {
          id: { in: body.privileges },
          isActive: true,
        },
      });

      if (privilegeCount !== body.privileges.length) {
        return NextResponse.json(
          {
            error: "Invalid privileges",
            message: "One or more selected privileges are invalid or inactive",
          },
          { status: 400 }
        );
      }
    }

    // Get old values for audit
    const oldRequest = await prisma.privilegeRequest.findUnique({
      where: { id },
      include: {
        requestedPrivileges: {
          select: { privilegeId: true },
        },
      },
    });

    // Update request and privileges in transaction
    const updatedRequest = await prisma.$transaction(async (tx) => {
      // Update the request
      const updated = await tx.privilegeRequest.update({
        where: { id },
        data: {
          type: body.type,
          requestType: body.requestType,
          reapplicationReason: body.reapplicationReason,
          hospitalCenter: body.hospitalCenter,
          currentJob: body.currentJob,
        },
      });

      // Update privileges if provided
      if (body.privileges !== undefined) {
        // Delete existing privileges
        await tx.requestedPrivilege.deleteMany({
          where: { requestId: id },
        });

        // Add new privileges
        if (body.privileges.length > 0) {
          await tx.requestedPrivilege.createMany({
            data: body.privileges.map((privilegeId) => ({
              requestId: id,
              privilegeId,
            })),
          });
        }
      }

      // Fetch updated request with relations
      return tx.privilegeRequest.findUnique({
        where: { id },
        include: {
          applicant: {
            select: {
              id: true,
              nameEn: true,
              nameAr: true,
              email: true,
            },
          },
          requestedPrivileges: {
            include: {
              privilege: true,
            },
          },
        },
      });
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "UPDATE",
        entityType: "privilege_requests",
        entityId: id,
        oldValues: {
          type: oldRequest?.type,
          requestType: oldRequest?.requestType,
          privileges: oldRequest?.requestedPrivileges.map((p) => p.privilegeId),
        },
        newValues: {
          type: body.type,
          requestType: body.requestType,
          privileges: body.privileges,
        },
      },
    });

    return NextResponse.json({
      message: "Request updated successfully",
      data: updatedRequest,
    });
  } catch (error) {
    console.error("PATCH /api/requests/[id] error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to update request" },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE - Delete Draft Request
// ============================================================================

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Please sign in to continue" },
        { status: 401 }
      );
    }

    const { id } = await params;

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

    const privilegeRequest = await prisma.privilegeRequest.findUnique({
      where: { id },
      select: {
        id: true,
        applicantId: true,
        status: true,
      },
    });

    if (!privilegeRequest) {
      return NextResponse.json(
        { error: "Not found", message: "Privilege request not found" },
        { status: 404 }
      );
    }

    // Check if user owns the request
    if (privilegeRequest.applicantId !== user.id && user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        {
          error: "Forbidden",
          message: "You can only delete your own requests",
        },
        { status: 403 }
      );
    }

    // Only drafts can be deleted
    if (privilegeRequest.status !== RequestStatus.DRAFT) {
      return NextResponse.json(
        {
          error: "Cannot delete",
          message: "Only draft requests can be deleted",
        },
        { status: 400 }
      );
    }

    // Delete request (cascade will handle related records)
    await prisma.privilegeRequest.delete({
      where: { id },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "DELETE",
        entityType: "privilege_requests",
        entityId: id,
        oldValues: {
          status: privilegeRequest.status,
        },
      },
    });

    return NextResponse.json({
      message: "Request deleted successfully",
    });
  } catch (error) {
    console.error("DELETE /api/requests/[id] error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to delete request" },
      { status: 500 }
    );
  }
}
