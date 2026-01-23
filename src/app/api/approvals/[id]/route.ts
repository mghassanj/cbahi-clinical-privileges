/**
 * CBAHI Clinical Privileges - Single Approval API
 *
 * GET  - Get approval details
 * POST - Process approval (approve, reject, request modifications)
 *        Body: { action: 'approve' | 'reject' | 'request_modifications', comments?, grantedPrivileges? }
 *        On approve: forward to next level or complete workflow
 *        On reject: notify applicant, end workflow
 *        On request_modifications: return to applicant
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import {
  RequestStatus,
  ApprovalStatus,
  ApprovalLevel,
  PrivilegeStatus,
  UserRole,
} from "@prisma/client";

// ============================================================================
// Types
// ============================================================================

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface ProcessApprovalBody {
  action: "approve" | "reject" | "request_modifications";
  comments?: string;
  signature?: string;
  grantedPrivileges?: {
    privilegeId: string;
    status: PrivilegeStatus;
    gdharApproval?: boolean;
    comments?: string;
  }[];
}

// Approval level hierarchy
const APPROVAL_LEVEL_ORDER: ApprovalLevel[] = [
  ApprovalLevel.HEAD_OF_SECTION,
  ApprovalLevel.HEAD_OF_DEPT,
  ApprovalLevel.COMMITTEE,
  ApprovalLevel.MEDICAL_DIRECTOR,
];

// ============================================================================
// GET - Get Approval Details
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

    const approval = await prisma.approval.findUnique({
      where: { id },
      include: {
        request: {
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
            },
            approvals: {
              include: {
                approver: {
                  select: {
                    id: true,
                    nameEn: true,
                    nameAr: true,
                    role: true,
                  },
                },
              },
              orderBy: { createdAt: "asc" },
            },
          },
        },
        approver: {
          select: {
            id: true,
            nameEn: true,
            nameAr: true,
            role: true,
            email: true,
          },
        },
        escalations: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!approval) {
      return NextResponse.json(
        { error: "Not found", message: "Approval not found" },
        { status: 404 }
      );
    }

    // Check access permissions
    const canView =
      user.role === UserRole.ADMIN ||
      user.role === UserRole.MEDICAL_DIRECTOR ||
      approval.approverId === user.id ||
      approval.request.applicantId === user.id;

    if (!canView) {
      return NextResponse.json(
        {
          error: "Forbidden",
          message: "You do not have permission to view this approval",
        },
        { status: 403 }
      );
    }

    // Add computed fields
    const response = {
      ...approval,
      canProcess:
        approval.approverId === user.id && approval.status === "PENDING",
      isCurrentLevel: approval.status === "PENDING",
      levelIndex: APPROVAL_LEVEL_ORDER.indexOf(approval.level),
      totalLevels: approval.request.approvals.length,
    };

    return NextResponse.json({ data: response });
  } catch (error) {
    console.error("GET /api/approvals/[id] error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to fetch approval" },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST - Process Approval
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

    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, nameEn: true, email: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found", message: "User profile not found" },
        { status: 404 }
      );
    }

    const approval = await prisma.approval.findUnique({
      where: { id },
      include: {
        request: {
          include: {
            applicant: {
              select: {
                id: true,
                nameEn: true,
                email: true,
              },
            },
            approvals: {
              orderBy: { createdAt: "asc" },
            },
            requestedPrivileges: true,
          },
        },
      },
    });

    if (!approval) {
      return NextResponse.json(
        { error: "Not found", message: "Approval not found" },
        { status: 404 }
      );
    }

    // Check if user is the assigned approver
    if (approval.approverId !== user.id && user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        {
          error: "Forbidden",
          message: "You are not authorized to process this approval",
        },
        { status: 403 }
      );
    }

    // Check if approval is pending
    if (approval.status !== ApprovalStatus.PENDING) {
      return NextResponse.json(
        {
          error: "Already processed",
          message: `This approval has already been ${approval.status.toLowerCase()}`,
        },
        { status: 400 }
      );
    }

    const body: ProcessApprovalBody = await request.json();

    // Validate action
    if (!["approve", "reject", "request_modifications"].includes(body.action)) {
      return NextResponse.json(
        {
          error: "Invalid action",
          message: "Action must be 'approve', 'reject', or 'request_modifications'",
        },
        { status: 400 }
      );
    }

    // Process based on action
    let result;
    switch (body.action) {
      case "approve":
        result = await processApprove(approval, user, body);
        break;
      case "reject":
        result = await processReject(approval, user, body);
        break;
      case "request_modifications":
        result = await processRequestModifications(approval, user, body);
        break;
    }

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: `APPROVAL_${body.action.toUpperCase()}`,
        entityType: "approvals",
        entityId: id,
        newValues: {
          action: body.action,
          comments: body.comments,
          requestId: approval.requestId,
        },
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/approvals/[id] error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to process approval" },
      { status: 500 }
    );
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

interface ApprovalWithRelations {
  id: string;
  requestId: string;
  approverId: string;
  level: ApprovalLevel;
  status: ApprovalStatus;
  request: {
    id: string;
    applicantId: string;
    applicant: {
      id: string;
      nameEn: string;
      email: string;
    };
    approvals: Array<{
      id: string;
      level: ApprovalLevel;
      approverId: string;
      status: ApprovalStatus;
    }>;
    requestedPrivileges: Array<{
      id: string;
      privilegeId: string;
    }>;
  };
}

interface UserInfo {
  id: string;
  role: UserRole;
  nameEn: string;
  email: string;
}

/**
 * Process approval action
 */
async function processApprove(
  approval: ApprovalWithRelations,
  user: UserInfo,
  body: ProcessApprovalBody
) {
  const currentLevelIndex = APPROVAL_LEVEL_ORDER.indexOf(approval.level);
  const allApprovals = approval.request.approvals;

  // Find next approval in chain
  const nextApproval = allApprovals.find((a) => {
    const aLevelIndex = APPROVAL_LEVEL_ORDER.indexOf(a.level);
    return aLevelIndex > currentLevelIndex && a.status === ApprovalStatus.PENDING;
  });

  const isLastApproval = !nextApproval;

  await prisma.$transaction(async (tx) => {
    // Update current approval
    await tx.approval.update({
      where: { id: approval.id },
      data: {
        status: ApprovalStatus.APPROVED,
        comments: body.comments,
        signature: body.signature,
        approvedAt: new Date(),
      },
    });

    // Update privilege statuses if provided
    if (body.grantedPrivileges && body.grantedPrivileges.length > 0) {
      for (const priv of body.grantedPrivileges) {
        await tx.requestedPrivilege.updateMany({
          where: {
            requestId: approval.requestId,
            privilegeId: priv.privilegeId,
          },
          data: {
            status: priv.status,
            gdharApproval: priv.gdharApproval,
            comments: priv.comments,
          },
        });
      }
    }

    // Resolve any active escalations for this approval
    await tx.escalation.updateMany({
      where: {
        approvalId: approval.id,
        status: "ACTIVE",
      },
      data: {
        status: "RESOLVED",
        resolvedAt: new Date(),
      },
    });

    if (isLastApproval) {
      // Final approval - complete the request
      await tx.privilegeRequest.update({
        where: { id: approval.requestId },
        data: {
          status: RequestStatus.APPROVED,
          completedAt: new Date(),
        },
      });

      // Update all pending privileges to approved (if not explicitly set)
      await tx.requestedPrivilege.updateMany({
        where: {
          requestId: approval.requestId,
          status: PrivilegeStatus.PENDING,
        },
        data: {
          status: PrivilegeStatus.APPROVED,
        },
      });

      // Create notification for applicant
      await tx.notificationLog.create({
        data: {
          requestId: approval.requestId,
          type: "REQUEST_APPROVED",
          recipientEmail: approval.request.applicant.email,
          recipientName: approval.request.applicant.nameEn,
          subject: "Your Clinical Privilege Request Has Been Approved",
          status: "PENDING",
          metadata: {
            finalApprover: user.nameEn,
          },
        },
      });
    } else {
      // Forward to next approver
      await tx.privilegeRequest.update({
        where: { id: approval.requestId },
        data: {
          status: RequestStatus.IN_REVIEW,
        },
      });

      // Get next approver details
      const nextApproverDetails = await tx.user.findUnique({
        where: { id: nextApproval.approverId },
        select: { email: true, nameEn: true },
      });

      // Create escalation record for next approver
      await tx.escalation.create({
        data: {
          requestId: approval.requestId,
          approverId: nextApproval.approverId,
          approvalId: nextApproval.id,
          receivedAt: new Date(),
        },
      });

      // Create notification for next approver
      if (nextApproverDetails) {
        await tx.notificationLog.create({
          data: {
            requestId: approval.requestId,
            type: "APPROVAL_REQUIRED",
            recipientEmail: nextApproverDetails.email,
            recipientName: nextApproverDetails.nameEn,
            subject: `Clinical Privilege Request Awaiting Your Approval - ${approval.request.applicant.nameEn}`,
            status: "PENDING",
            metadata: {
              applicantName: approval.request.applicant.nameEn,
              previousApprover: user.nameEn,
              approvalLevel: nextApproval.level,
            },
          },
        });
      }
    }
  });

  return {
    message: isLastApproval
      ? "Request fully approved"
      : "Approval recorded, forwarded to next level",
    isComplete: isLastApproval,
    nextLevel: isLastApproval ? null : nextApproval?.level,
  };
}

/**
 * Process rejection action
 */
async function processReject(
  approval: ApprovalWithRelations,
  user: UserInfo,
  body: ProcessApprovalBody
) {
  if (!body.comments) {
    return {
      error: "Comments required",
      message: "Please provide a reason for rejection",
    };
  }

  await prisma.$transaction(async (tx) => {
    // Update approval status
    await tx.approval.update({
      where: { id: approval.id },
      data: {
        status: ApprovalStatus.REJECTED,
        comments: body.comments,
        approvedAt: new Date(),
      },
    });

    // Update request status
    await tx.privilegeRequest.update({
      where: { id: approval.requestId },
      data: {
        status: RequestStatus.REJECTED,
        completedAt: new Date(),
      },
    });

    // Reject all pending privileges
    await tx.requestedPrivilege.updateMany({
      where: {
        requestId: approval.requestId,
        status: PrivilegeStatus.PENDING,
      },
      data: {
        status: PrivilegeStatus.REJECTED,
      },
    });

    // Cancel any active escalations
    await tx.escalation.updateMany({
      where: {
        requestId: approval.requestId,
        status: "ACTIVE",
      },
      data: {
        status: "CANCELLED",
        resolvedAt: new Date(),
      },
    });

    // Skip remaining approvals
    await tx.approval.updateMany({
      where: {
        requestId: approval.requestId,
        status: ApprovalStatus.PENDING,
        id: { not: approval.id },
      },
      data: {
        status: ApprovalStatus.SKIPPED,
      },
    });

    // Notify applicant
    await tx.notificationLog.create({
      data: {
        requestId: approval.requestId,
        type: "REQUEST_REJECTED",
        recipientEmail: approval.request.applicant.email,
        recipientName: approval.request.applicant.nameEn,
        subject: "Your Clinical Privilege Request Has Been Rejected",
        status: "PENDING",
        metadata: {
          rejectedBy: user.nameEn,
          rejectionLevel: approval.level,
          reason: body.comments,
        },
      },
    });
  });

  return {
    message: "Request rejected",
    isComplete: true,
  };
}

/**
 * Process request modifications action
 */
async function processRequestModifications(
  approval: ApprovalWithRelations,
  user: UserInfo,
  body: ProcessApprovalBody
) {
  if (!body.comments) {
    return {
      error: "Comments required",
      message: "Please specify what modifications are needed",
    };
  }

  await prisma.$transaction(async (tx) => {
    // Update approval to indicate modifications requested
    await tx.approval.update({
      where: { id: approval.id },
      data: {
        comments: body.comments,
        // Keep status as PENDING so it can be re-reviewed after modifications
      },
    });

    // Return request to draft status for modifications
    await tx.privilegeRequest.update({
      where: { id: approval.requestId },
      data: {
        status: RequestStatus.DRAFT,
      },
    });

    // Pause escalation
    await tx.escalation.updateMany({
      where: {
        approvalId: approval.id,
        status: "ACTIVE",
      },
      data: {
        status: "CANCELLED",
        notes: "Modifications requested",
        resolvedAt: new Date(),
      },
    });

    // Notify applicant
    await tx.notificationLog.create({
      data: {
        requestId: approval.requestId,
        type: "REMINDER",
        recipientEmail: approval.request.applicant.email,
        recipientName: approval.request.applicant.nameEn,
        subject: "Modifications Requested for Your Clinical Privilege Request",
        status: "PENDING",
        metadata: {
          requestedBy: user.nameEn,
          requesterRole: approval.level,
          modifications: body.comments,
        },
      },
    });
  });

  return {
    message: "Modifications requested, applicant notified",
    isComplete: false,
  };
}
