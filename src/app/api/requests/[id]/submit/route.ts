/**
 * CBAHI Clinical Privileges - Submit Request API
 *
 * POST - Submit draft request for approval
 *        Creates approval chain based on applicant's department hierarchy
 *        Sends notification to first approver
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import {
  RequestStatus,
  UserRole,
  ApprovalLevel,
  Prisma,
} from "@prisma/client";

// ============================================================================
// Types
// ============================================================================

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface ApproverInfo {
  approverId: string;
  level: ApprovalLevel;
  email: string;
  nameEn: string;
}

// ============================================================================
// POST - Submit Request for Approval
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
      select: {
        id: true,
        role: true,
        nameEn: true,
        email: true,
        departmentId: true,
        lineManagerId: true,
        lineManager: {
          select: {
            id: true,
            role: true,
            email: true,
            nameEn: true,
            isActive: true,
            status: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found", message: "User profile not found" },
        { status: 404 }
      );
    }

    // Get the request
    const privilegeRequest = await prisma.privilegeRequest.findUnique({
      where: { id },
      include: {
        requestedPrivileges: true,
        approvals: true,
      },
    });

    if (!privilegeRequest) {
      return NextResponse.json(
        { error: "Not found", message: "Privilege request not found" },
        { status: 404 }
      );
    }

    // Check ownership
    if (privilegeRequest.applicantId !== user.id) {
      return NextResponse.json(
        {
          error: "Forbidden",
          message: "You can only submit your own requests",
        },
        { status: 403 }
      );
    }

    // Check if already submitted
    if (privilegeRequest.status !== RequestStatus.DRAFT) {
      return NextResponse.json(
        {
          error: "Already submitted",
          message: `Request is already in ${privilegeRequest.status} status`,
        },
        { status: 400 }
      );
    }

    // Check if request has privileges
    if (privilegeRequest.requestedPrivileges.length === 0) {
      return NextResponse.json(
        {
          error: "No privileges",
          message: "Please select at least one privilege before submitting",
        },
        { status: 400 }
      );
    }

    // Build approval chain
    const approvers = await buildApprovalChain(user);

    if (approvers.length === 0) {
      return NextResponse.json(
        {
          error: "No approvers",
          message: "No approvers found for your request. Please contact administrator.",
        },
        { status: 400 }
      );
    }

    // Submit request in transaction
    const updatedRequest = await prisma.$transaction(async (tx) => {
      // Update request status
      const updated = await tx.privilegeRequest.update({
        where: { id },
        data: {
          status: RequestStatus.PENDING,
          submittedAt: new Date(),
        },
      });

      // Delete any existing approvals (in case of resubmission after rejection)
      await tx.approval.deleteMany({
        where: { requestId: id },
      });

      // Delete any existing escalations
      await tx.escalation.deleteMany({
        where: { requestId: id },
      });

      // Create approval records
      await tx.approval.createMany({
        data: approvers.map((approver) => ({
          requestId: id,
          approverId: approver.approverId,
          level: approver.level,
          status: "PENDING",
        })),
      });

      // Get first approval for escalation tracking
      const firstApproval = await tx.approval.findFirst({
        where: { requestId: id },
        orderBy: { createdAt: "asc" },
      });

      // Create escalation record for first approver
      if (firstApproval) {
        await tx.escalation.create({
          data: {
            requestId: id,
            approverId: approvers[0].approverId,
            approvalId: firstApproval.id,
            receivedAt: new Date(),
          },
        });
      }

      // Create notification log for first approver
      await tx.notificationLog.create({
        data: {
          requestId: id,
          type: "APPROVAL_REQUIRED",
          recipientEmail: approvers[0].email,
          recipientName: approvers[0].nameEn,
          subject: `Clinical Privilege Request Awaiting Your Approval - ${user.nameEn}`,
          status: "PENDING",
          metadata: {
            applicantName: user.nameEn,
            applicantEmail: user.email,
            approvalLevel: approvers[0].level,
          },
        },
      });

      // Create notification for applicant
      await tx.notificationLog.create({
        data: {
          requestId: id,
          type: "REQUEST_SUBMITTED",
          recipientEmail: user.email,
          recipientName: user.nameEn,
          subject: "Your Clinical Privilege Request Has Been Submitted",
          status: "PENDING",
          metadata: {
            firstApprover: approvers[0].nameEn,
            approvalLevel: approvers[0].level,
          },
        },
      });

      // Fetch updated request with all relations
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
              privilege: {
                select: {
                  id: true,
                  code: true,
                  nameEn: true,
                  category: true,
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
                  role: true,
                },
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      });
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "SUBMIT",
        entityType: "privilege_requests",
        entityId: id,
        newValues: {
          status: RequestStatus.PENDING,
          approvers: approvers.map((a) => ({
            level: a.level,
            name: a.nameEn,
          })),
        },
      },
    });

    return NextResponse.json({
      message: "Request submitted successfully",
      data: updatedRequest,
      approvalChain: approvers.map((a) => ({
        level: a.level,
        approverName: a.nameEn,
      })),
    });
  } catch (error) {
    console.error("POST /api/requests/[id]/submit error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to submit request" },
      { status: 500 }
    );
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

interface UserWithLineManager {
  id: string;
  role: UserRole;
  departmentId: number | null;
  lineManagerId: string | null;
  lineManager: {
    id: string;
    role: UserRole;
    email: string;
    nameEn: string;
    isActive: boolean;
    status: string;
  } | null;
}

/**
 * Build approval chain based on user's department hierarchy
 */
async function buildApprovalChain(user: UserWithLineManager): Promise<ApproverInfo[]> {
  const approvers: ApproverInfo[] = [];

  // 1. Head of Section (if line manager has that role)
  if (
    user.lineManager &&
    user.lineManager.role === UserRole.HEAD_OF_SECTION &&
    user.lineManager.isActive &&
    user.lineManager.status === "ACTIVE"
  ) {
    approvers.push({
      approverId: user.lineManager.id,
      level: ApprovalLevel.HEAD_OF_SECTION,
      email: user.lineManager.email,
      nameEn: user.lineManager.nameEn,
    });
  }

  // 2. Head of Department
  const headOfDept = await prisma.user.findFirst({
    where: {
      role: UserRole.HEAD_OF_DEPT,
      departmentId: user.departmentId,
      isActive: true,
      status: "ACTIVE",
      id: { not: user.id }, // Exclude self
    },
    select: {
      id: true,
      email: true,
      nameEn: true,
    },
  });

  if (headOfDept) {
    approvers.push({
      approverId: headOfDept.id,
      level: ApprovalLevel.HEAD_OF_DEPT,
      email: headOfDept.email,
      nameEn: headOfDept.nameEn,
    });
  }

  // 3. Committee Member
  const committeeMember = await prisma.user.findFirst({
    where: {
      role: UserRole.COMMITTEE_MEMBER,
      isActive: true,
      status: "ACTIVE",
    },
    select: {
      id: true,
      email: true,
      nameEn: true,
    },
  });

  if (committeeMember) {
    approvers.push({
      approverId: committeeMember.id,
      level: ApprovalLevel.COMMITTEE,
      email: committeeMember.email,
      nameEn: committeeMember.nameEn,
    });
  }

  // 4. Medical Director (final approval)
  const medicalDirector = await prisma.user.findFirst({
    where: {
      role: UserRole.MEDICAL_DIRECTOR,
      isActive: true,
      status: "ACTIVE",
    },
    select: {
      id: true,
      email: true,
      nameEn: true,
    },
  });

  if (medicalDirector) {
    approvers.push({
      approverId: medicalDirector.id,
      level: ApprovalLevel.MEDICAL_DIRECTOR,
      email: medicalDirector.email,
      nameEn: medicalDirector.nameEn,
    });
  }

  return approvers;
}
