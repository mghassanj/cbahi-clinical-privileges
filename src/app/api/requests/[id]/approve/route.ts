/**
 * CBAHI Clinical Privileges - Request Approval API
 *
 * POST - Submit approval decision for a privilege request
 * GET - Get approval progress and requirements
 * 
 * Implements CBAHI/MOH approval matrix:
 * - Core privileges: Auto-approved
 * - Non-core (same specialty): 1 consultant + Medical Director
 * - Non-core (different specialty): 2 consultants + committee + Medical Director
 * - Additional: 2 consultants + committee + Medical Director
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { RequestStatus, DentalSpecialty } from "@prisma/client";
import {
  notifyRequestApproved,
  notifyRequestRejected,
  notifyModificationsRequested,
} from "@/lib/notifications/broadcast";
import {
  canUserApprove,
  processApproval,
  getApprovalProgress,
  getApprovalRequirements,
  isSameSpecialty,
} from "@/lib/approval-workflow";

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
// GET - Get Approval Progress
// ============================================================================

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Please sign in to continue" },
        { status: 401 }
      );
    }

    const { id: requestId } = await params;

    // Get request details
    const privilegeRequest = await prisma.privilegeRequest.findUnique({
      where: { id: requestId },
      include: {
        applicant: true,
        requestedPrivileges: {
          include: {
            privilege: true,
          },
        },
      },
    });

    if (!privilegeRequest) {
      return NextResponse.json(
        { error: "Not found", message: "Request not found" },
        { status: 404 }
      );
    }

    // Get approval progress
    const progress = await getApprovalProgress(requestId);

    // Check if current user can approve
    const userCanApprove = await canUserApprove(session.user.id, requestId);

    // Determine if same specialty
    const privilegeSpecialties = privilegeRequest.requestedPrivileges
      .map(rp => rp.privilege.requiredSpecialty)
      .filter(Boolean);
    
    const sameSpecialty = privilegeSpecialties.length === 0 || 
      privilegeSpecialties.every(ps => 
        isSameSpecialty(
          privilegeRequest.applicant.specialty,
          ps,
          privilegeRequest.applicant.additionalSpecialties as DentalSpecialty[]
        )
      );

    // Get requirements
    const requirements = await getApprovalRequirements(
      privilegeRequest.applicant.practitionerType || 'GP',
      privilegeRequest.requestType,
      sameSpecialty
    );

    return NextResponse.json({
      success: true,
      data: {
        requestId,
        requestType: privilegeRequest.requestType,
        applicant: {
          id: privilegeRequest.applicant.id,
          nameEn: privilegeRequest.applicant.nameEn,
          nameAr: privilegeRequest.applicant.nameAr,
          practitionerType: privilegeRequest.applicant.practitionerType,
          specialty: privilegeRequest.applicant.specialty,
        },
        progress,
        requirements,
        sameSpecialty,
        currentUser: {
          canApprove: userCanApprove.canApprove,
          reason: userCanApprove.reason,
          level: userCanApprove.level,
        },
      },
    });
  } catch (error) {
    console.error("Error getting approval progress:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: "An error occurred while getting approval progress",
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST - Submit Approval Decision
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
      select: { 
        id: true, 
        role: true, 
        nameEn: true,
        canApprovePrivileges: true,
        practitionerType: true,
        specialty: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found", message: "User profile not found" },
        { status: 404 }
      );
    }

    // Check if user can approve this specific request
    const userCanApprove = await canUserApprove(session.user.id, requestId);
    if (!userCanApprove.canApprove) {
      return NextResponse.json(
        { error: "Forbidden", message: userCanApprove.reason || "You cannot approve this request" },
        { status: 403 }
      );
    }

    // Get the request with applicant information for notifications
    const privilegeRequest = await prisma.privilegeRequest.findUnique({
      where: { id: requestId },
      include: {
        applicant: {
          select: {
            id: true,
            nameEn: true,
            nameAr: true,
          },
        },
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

    // Handle RETURNED status (modifications requested)
    if (status === "RETURNED") {
      await prisma.privilegeRequest.update({
        where: { id: requestId },
        data: {
          status: RequestStatus.PENDING,
        },
      });

      // Send notification
      const requestRef = requestId.slice(-8).toUpperCase();
      try {
        notifyModificationsRequested(
          privilegeRequest.applicant.id,
          requestId,
          requestRef,
          comments || "Please review and update your request",
          comments || "يرجى مراجعة وتحديث طلبك"
        );
      } catch (e) {
        console.error("Notification error:", e);
      }

      return NextResponse.json({
        success: true,
        message: "Request returned for modifications",
        data: { newStatus: RequestStatus.PENDING },
      });
    }

    // Process the approval using the workflow service
    const result = await processApproval(
      requestId,
      session.user.id,
      status as 'APPROVED' | 'REJECTED',
      comments
    );

    if (!result.success) {
      return NextResponse.json(
        { error: "Approval failed", message: result.message },
        { status: 400 }
      );
    }

    // Update individual privilege decisions if provided
    if (privilegeDecisions && privilegeDecisions.length > 0) {
      for (const decision of privilegeDecisions) {
        await prisma.requestedPrivilege.updateMany({
          where: {
            requestId,
            privilegeId: decision.privilegeId,
          },
          data: {
            status: decision.approved ? 'APPROVED' : 'REJECTED',
            comments: decision.comments || null,
          },
        });
      }
    }

    // Send notifications
    const requestRef = requestId.slice(-8).toUpperCase();
    try {
      if (status === "APPROVED") {
        const isFinalApproval = result.newStatus === RequestStatus.APPROVED;
        notifyRequestApproved(
          privilegeRequest.applicant.id,
          requestId,
          requestRef,
          user.nameEn,
          user.nameEn,
          isFinalApproval
        );
      } else if (status === "REJECTED") {
        notifyRequestRejected(
          privilegeRequest.applicant.id,
          requestId,
          requestRef,
          comments || "No reason provided",
          comments || "لم يتم تقديم سبب"
        );
      }
    } catch (notificationError) {
      console.error("Failed to send notification:", notificationError);
    }

    // Get updated progress for response
    const progress = await getApprovalProgress(requestId);

    return NextResponse.json({
      success: true,
      message: result.message,
      data: {
        newStatus: result.newStatus,
        progress,
      },
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
