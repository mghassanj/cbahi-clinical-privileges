/**
 * CBAHI Clinical Privileges - Submit Request API
 *
 * POST - Submit draft request for approval
 *        Creates approval chain based on CBAHI requirements:
 *        - Core privileges: Auto-approved
 *        - Non-core (same specialty): 1 consultant + Medical Director
 *        - Non-core (different specialty): 2 consultants + committee + Medical Director
 *        - Additional: 2 consultants + committee + Medical Director
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  RequestStatus,
  UserRole,
  ApprovalLevel,
  PractitionerType,
  DentalSpecialty,
  PrivilegeRequestType,
} from "@prisma/client";
import { notifyApprovalRequired } from "@/lib/notifications/broadcast";
import {
  autoApproveIfEligible,
  getApprovalRequirements,
  isSameSpecialty,
} from "@/lib/approval-workflow";

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
  specialty?: DentalSpecialty | null;
}

// ============================================================================
// POST - Submit Request for Approval
// ============================================================================

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

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
        practitionerType: true,
        specialty: true,
        additionalSpecialties: true,
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
        requestedPrivileges: {
          include: {
            privilege: true,
          },
        },
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

    // Determine if privileges are in same specialty
    const privilegeSpecialties = privilegeRequest.requestedPrivileges
      .map(rp => rp.privilege.requiredSpecialty)
      .filter(Boolean) as DentalSpecialty[];
    
    const sameSpecialty = privilegeSpecialties.length === 0 || 
      privilegeSpecialties.every(ps => 
        isSameSpecialty(
          user.specialty,
          ps,
          user.additionalSpecialties as DentalSpecialty[]
        )
      );

    // Get approval requirements based on CBAHI matrix
    const requirements = await getApprovalRequirements(
      user.practitionerType || PractitionerType.GP,
      privilegeRequest.requestType,
      sameSpecialty
    );

    // Check for auto-approval (core privileges)
    if (requirements.autoApprove) {
      const autoResult = await autoApproveIfEligible(id);
      
      if (autoResult.autoApproved) {
        // Log audit
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: "AUTO_APPROVE",
            entityType: "privilege_requests",
            entityId: id,
            newValues: {
              status: RequestStatus.APPROVED,
              reason: "Core privileges auto-approved per CBAHI requirements",
            },
          },
        });

        const updatedRequest = await prisma.privilegeRequest.findUnique({
          where: { id },
          include: {
            applicant: {
              select: { id: true, nameEn: true, nameAr: true, email: true },
            },
            requestedPrivileges: {
              include: {
                privilege: {
                  select: { id: true, code: true, nameEn: true, category: true },
                },
              },
            },
          },
        });

        return NextResponse.json({
          message: "Request auto-approved (core privileges)",
          data: updatedRequest,
          autoApproved: true,
          requirements,
        });
      }
    }

    // Build approval chain based on CBAHI requirements
    const approvers = await buildCbahiApprovalChain(
      user,
      privilegeRequest.requestType,
      sameSpecialty,
      privilegeSpecialties[0] || null,
      requirements
    );

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
      await tx.privilegeRequest.update({
        where: { id },
        data: {
          status: RequestStatus.PENDING,
          submittedAt: new Date(),
        },
      });

      // Delete any existing approvals (in case of resubmission)
      await tx.approval.deleteMany({
        where: { requestId: id },
      });

      // Delete any existing escalations
      await tx.escalation.deleteMany({
        where: { requestId: id },
      });

      // Create approval records for each approver
      for (const approver of approvers) {
        await tx.approval.create({
          data: {
            requestId: id,
            approverId: approver.approverId,
            level: approver.level,
            status: "PENDING",
          },
        });
      }

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

      // Create notification logs
      for (const approver of approvers) {
        await tx.notificationLog.create({
          data: {
            requestId: id,
            type: "APPROVAL_REQUIRED",
            recipientEmail: approver.email,
            recipientName: approver.nameEn,
            subject: `Clinical Privilege Request Awaiting Your Approval - ${user.nameEn}`,
            status: "PENDING",
            metadata: {
              applicantName: user.nameEn,
              applicantEmail: user.email,
              approvalLevel: approver.level,
              requestType: privilegeRequest.requestType,
              sameSpecialty,
            },
          },
        });
      }

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
            approvers: approvers.map(a => a.nameEn),
            requirements: {
              requiredConsultants: requirements.requiredConsultants,
              requiresCommittee: requirements.requiresCommittee,
              requiresMedicalDirector: requirements.requiresMedicalDirector,
            },
          },
        },
      });

      return tx.privilegeRequest.findUnique({
        where: { id },
        include: {
          applicant: {
            select: { id: true, nameEn: true, nameAr: true, email: true },
          },
          requestedPrivileges: {
            include: {
              privilege: {
                select: { id: true, code: true, nameEn: true, category: true },
              },
            },
          },
          approvals: {
            include: {
              approver: {
                select: { id: true, nameEn: true, nameAr: true, role: true, specialty: true },
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
          requestType: privilegeRequest.requestType,
          sameSpecialty,
          requirements,
          approvers: approvers.map((a) => ({
            level: a.level,
            name: a.nameEn,
            specialty: a.specialty,
          })),
        },
      },
    });

    // Send real-time notifications to all pending approvers
    try {
      const requestRef = id.slice(-8).toUpperCase();
      for (const approver of approvers) {
        notifyApprovalRequired(
          approver.approverId,
          id,
          requestRef,
          user.nameEn,
          user.nameEn
        );
      }
    } catch (notificationError) {
      console.error("Failed to send real-time notification:", notificationError);
    }

    return NextResponse.json({
      message: "Request submitted successfully",
      data: updatedRequest,
      requirements,
      approvalChain: approvers.map((a) => ({
        level: a.level,
        approverName: a.nameEn,
        specialty: a.specialty,
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

interface UserForApprovalChain {
  id: string;
  role: UserRole;
  departmentId: number | null;
  practitionerType: PractitionerType | null;
  specialty: DentalSpecialty | null;
  additionalSpecialties: DentalSpecialty[];
}

interface ApprovalRequirementsInput {
  requiredConsultants: number;
  requiresCommittee: boolean;
  requiresMedicalDirector: boolean;
  autoApprove: boolean;
}

/**
 * Build approval chain based on CBAHI requirements
 */
async function buildCbahiApprovalChain(
  user: UserForApprovalChain,
  requestType: PrivilegeRequestType,
  sameSpecialty: boolean,
  targetSpecialty: DentalSpecialty | null,
  requirements: ApprovalRequirementsInput
): Promise<ApproverInfo[]> {
  const approvers: ApproverInfo[] = [];

  // 1. Get consultant approvers from the required specialty
  if (requirements.requiredConsultants > 0) {
    const consultantQuery: Record<string, unknown> = {
      canApprovePrivileges: true,
      practitionerType: PractitionerType.CONSULTANT,
      isActive: true,
      status: "ACTIVE",
      id: { not: user.id }, // Exclude self
    };

    // Prefer consultants from the privilege's specialty
    if (targetSpecialty) {
      consultantQuery.OR = [
        { specialty: targetSpecialty },
        { additionalSpecialties: { has: targetSpecialty } },
      ];
    }

    const consultants = await prisma.user.findMany({
      where: consultantQuery,
      take: requirements.requiredConsultants,
      select: {
        id: true,
        email: true,
        nameEn: true,
        specialty: true,
      },
    });

    for (const consultant of consultants) {
      approvers.push({
        approverId: consultant.id,
        level: ApprovalLevel.COMMITTEE, // Consultants approve at committee level
        email: consultant.email,
        nameEn: consultant.nameEn,
        specialty: consultant.specialty,
      });
    }

    // If not enough consultants from specific specialty, get any consultants
    if (consultants.length < requirements.requiredConsultants) {
      const additionalConsultants = await prisma.user.findMany({
        where: {
          canApprovePrivileges: true,
          practitionerType: PractitionerType.CONSULTANT,
          isActive: true,
          status: "ACTIVE",
          id: { 
            notIn: [user.id, ...consultants.map(c => c.id)],
          },
        },
        take: requirements.requiredConsultants - consultants.length,
        select: {
          id: true,
          email: true,
          nameEn: true,
          specialty: true,
        },
      });

      for (const consultant of additionalConsultants) {
        approvers.push({
          approverId: consultant.id,
          level: ApprovalLevel.COMMITTEE,
          email: consultant.email,
          nameEn: consultant.nameEn,
          specialty: consultant.specialty,
        });
      }
    }
  }

  // 2. Add committee members if required
  if (requirements.requiresCommittee) {
    // Get committee members who aren't already in the list
    const existingIds = new Set(approvers.map(a => a.approverId));
    
    const committeeMembers = await prisma.user.findMany({
      where: {
        isCommitteeMember: true,
        isActive: true,
        status: "ACTIVE",
        id: { 
          notIn: [user.id, ...Array.from(existingIds)],
        },
      },
      take: 3, // Committee typically has 3 members for review
      select: {
        id: true,
        email: true,
        nameEn: true,
        specialty: true,
      },
    });

    for (const member of committeeMembers) {
      approvers.push({
        approverId: member.id,
        level: ApprovalLevel.COMMITTEE,
        email: member.email,
        nameEn: member.nameEn,
        specialty: member.specialty,
      });
    }
  }

  // 3. Add Medical Director for final approval
  if (requirements.requiresMedicalDirector) {
    const medicalDirector = await prisma.user.findFirst({
      where: {
        role: UserRole.MEDICAL_DIRECTOR,
        isActive: true,
        status: "ACTIVE",
        id: { not: user.id },
      },
      select: {
        id: true,
        email: true,
        nameEn: true,
        specialty: true,
      },
    });

    if (medicalDirector) {
      approvers.push({
        approverId: medicalDirector.id,
        level: ApprovalLevel.MEDICAL_DIRECTOR,
        email: medicalDirector.email,
        nameEn: medicalDirector.nameEn,
        specialty: medicalDirector.specialty,
      });
    }
  }

  return approvers;
}
