/**
 * CBAHI Clinical Privileges - Request Approval API
 *
 * POST - Submit approval decision for a privilege request
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { ApprovalLevel, ApprovalStatus, PrivilegeStatus, RequestStatus, UserRole } from "@prisma/client";

// ============================================================================
// Types
// ============================================================================

interface ApprovalRequestBody {
  status: "APPROVED" | "REJECTED" | "RETURNED";
  comments?: string;
  privilegeDecisions?: Array<{
    privilegeId: string;
    approved: boolean;
    comments?: string;
  }>;
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ============================================================================
// POST - Submit Approval Decision
// ============================================================================

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Please sign in to continue" },
        { status: 401 }
      );
    }

    const { id: requestId } = await params;
    const body: ApprovalRequestBody = await request.json();
    const { status, comments, privilegeDecisions } = body;

    // Validate status
    if (!["APPROVED", "REJECTED", "RETURNED"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status", message: "Status must be APPROVED, REJECTED, or RETURNED" },
        { status: 400 }
      );
    }

    // Get the user
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

    // Check if user has approval permissions
    const approverRoles: UserRole[] = [
      UserRole.HEAD_OF_SECTION,
      UserRole.HEAD_OF_DEPT,
      UserRole.COMMITTEE_MEMBER,
      UserRole.MEDICAL_DIRECTOR,
      UserRole.ADMIN,
    ];

    if (!approverRoles.includes(user.role)) {
      return NextResponse.json(
        { error: "Forbidden", message: "You do not have permission to approve requests" },
        { status: 403 }
      );
    }

    // Get the request
    const privilegeRequest = await prisma.privilegeRequest.findUnique({
      where: { id: requestId },
      include: {
        approvals: {
          where: { approverId: user.id },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        requestedPrivileges: true,
      },
    });

    if (!privilegeRequest) {
      return NextResponse.json(
        { error: "Not found", message: "Request not found" },
        { status: 404 }
      );
    }

    // Check if request is in a reviewable state
    if (
      privilegeRequest.status !== RequestStatus.PENDING &&
      privilegeRequest.status !== RequestStatus.IN_REVIEW
    ) {
      return NextResponse.json(
        {
          error: "Invalid state",
          message: "Request is not in a reviewable state",
        },
        { status: 400 }
      );
    }

    // Find existing approval record for this user
    const existingApproval = privilegeRequest.approvals[0];

    // Map status to ApprovalStatus enum
    // Note: RETURNED maps to REJECTED at the approval level, but PENDING at the request level
    const approvalStatusMap: Record<string, ApprovalStatus> = {
      APPROVED: ApprovalStatus.APPROVED,
      REJECTED: ApprovalStatus.REJECTED,
      RETURNED: ApprovalStatus.REJECTED, // Returned for modifications is treated as rejected at approval level
    };

    // Map user role to approval level
    const roleToLevelMap: Partial<Record<UserRole, ApprovalLevel>> = {
      [UserRole.HEAD_OF_SECTION]: ApprovalLevel.HEAD_OF_SECTION,
      [UserRole.HEAD_OF_DEPT]: ApprovalLevel.HEAD_OF_DEPT,
      [UserRole.COMMITTEE_MEMBER]: ApprovalLevel.COMMITTEE,
      [UserRole.MEDICAL_DIRECTOR]: ApprovalLevel.MEDICAL_DIRECTOR,
      [UserRole.ADMIN]: ApprovalLevel.MEDICAL_DIRECTOR, // Admin acts as Medical Director
    };

    const approvalLevel = roleToLevelMap[user.role];
    if (!approvalLevel) {
      return NextResponse.json(
        { error: "Invalid role", message: "Your role cannot approve requests" },
        { status: 403 }
      );
    }

    // Start a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update or create approval record
      let approval;
      if (existingApproval) {
        approval = await tx.approval.update({
          where: { id: existingApproval.id },
          data: {
            status: approvalStatusMap[status],
            comments,
            approvedAt: new Date(),
          },
        });
      } else {
        approval = await tx.approval.create({
          data: {
            requestId,
            approverId: user.id,
            level: approvalLevel,
            status: approvalStatusMap[status],
            comments,
            approvedAt: new Date(),
          },
        });
      }

      // Update privilege decisions if provided
      if (privilegeDecisions && privilegeDecisions.length > 0) {
        for (const decision of privilegeDecisions) {
          await tx.requestedPrivilege.updateMany({
            where: {
              requestId,
              privilegeId: decision.privilegeId,
            },
            data: {
              status: decision.approved ? PrivilegeStatus.APPROVED : PrivilegeStatus.REJECTED,
              comments: decision.comments || null,
            },
          });
        }
      }

      // Determine the new request status based on the decision
      let newRequestStatus: RequestStatus;

      if (status === "REJECTED") {
        newRequestStatus = RequestStatus.REJECTED;
      } else if (status === "RETURNED") {
        newRequestStatus = RequestStatus.PENDING; // Back to pending for modifications
      } else {
        // For APPROVED, check if this is the final approval level
        // Medical Director is the final level
        if (user.role === UserRole.MEDICAL_DIRECTOR || user.role === UserRole.ADMIN) {
          newRequestStatus = RequestStatus.APPROVED;
        } else {
          // Still needs more approvals
          newRequestStatus = RequestStatus.IN_REVIEW;
        }
      }

      // Update request status
      const updatedRequest = await tx.privilegeRequest.update({
        where: { id: requestId },
        data: {
          status: newRequestStatus,
          completedAt: newRequestStatus === RequestStatus.APPROVED || newRequestStatus === RequestStatus.REJECTED
            ? new Date()
            : undefined,
        },
      });

      return { approval, request: updatedRequest };
    });

    return NextResponse.json({
      success: true,
      message: `Request ${status.toLowerCase()} successfully`,
      data: result,
    });
  } catch (error) {
    console.error("Error processing approval:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: "An error occurred while processing the approval",
      },
      { status: 500 }
    );
  }
}
