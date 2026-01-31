/**
 * CBAHI Clinical Privileges - Approval Workflow Service
 * 
 * Implements the CBAHI/MOH approval matrix:
 * - Core privileges: Auto-approved for all practitioners
 * - Non-core (same specialty): 1 consultant + Medical Director
 * - Non-core (different specialty): 2 consultants + committee + Medical Director
 * - Additional: 2 consultants + committee + Medical Director
 */

import { prisma } from './db';
import {
  User,
  Privilege,
  PrivilegeRequest,
  Approval,
  PractitionerType,
  DentalSpecialty,
  PrivilegeRequestType,
  ApprovalLevel,
  ApprovalStatus,
  RequestStatus,
  UserRole,
} from '@prisma/client';

// ============================================================================
// Types
// ============================================================================

export interface ApprovalRequirements {
  requiredConsultants: number;
  requiresCommittee: boolean;
  requiresMedicalDirector: boolean;
  autoApprove: boolean;
  sameSpecialty: boolean;
  description: string;
}

export interface ApprovalProgress {
  consultantApprovals: number;
  requiredConsultants: number;
  committeeApproved: boolean;
  requiresCommittee: boolean;
  medicalDirectorApproved: boolean;
  requiresMedicalDirector: boolean;
  isComplete: boolean;
  nextApprovalLevel: ApprovalLevel | null;
  pendingApprovers: PendingApprover[];
}

export interface PendingApprover {
  userId: string;
  email: string;
  nameEn: string;
  nameAr: string | null;
  specialty: DentalSpecialty | null;
  role: UserRole;
  level: ApprovalLevel;
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Determine if a privilege is in the applicant's specialty
 */
export function isSameSpecialty(
  applicantSpecialty: DentalSpecialty | null,
  privilegeSpecialty: DentalSpecialty | null,
  applicantAdditionalSpecialties: DentalSpecialty[] = []
): boolean {
  // If no specialty required for privilege, consider it same specialty
  if (!privilegeSpecialty) return true;
  
  // If applicant has no specialty (GP), it's always different specialty
  if (!applicantSpecialty) return false;
  
  // Check primary specialty
  if (applicantSpecialty === privilegeSpecialty) return true;
  
  // Check additional specialties
  return applicantAdditionalSpecialties.includes(privilegeSpecialty);
}

/**
 * Get approval requirements for a privilege request
 */
export async function getApprovalRequirements(
  practitionerType: PractitionerType,
  privilegeType: PrivilegeRequestType,
  sameSpecialty: boolean
): Promise<ApprovalRequirements> {
  // Look up requirements from database
  const requirement = await prisma.approvalRequirement.findUnique({
    where: {
      privilegeType_practitionerType_sameSpecialty: {
        privilegeType,
        practitionerType,
        sameSpecialty,
      },
    },
  });

  if (requirement) {
    return {
      requiredConsultants: requirement.requiredConsultants,
      requiresCommittee: requirement.requiresCommittee,
      requiresMedicalDirector: requirement.requiresMedicalDirector,
      autoApprove: requirement.autoApprove,
      sameSpecialty,
      description: requirement.descriptionEn || '',
    };
  }

  // Fallback defaults (most restrictive)
  console.warn(`No approval requirement found for: ${practitionerType}/${privilegeType}/${sameSpecialty}`);
  return {
    requiredConsultants: 2,
    requiresCommittee: true,
    requiresMedicalDirector: true,
    autoApprove: false,
    sameSpecialty,
    description: 'Default approval requirements (fallback)',
  };
}

/**
 * Calculate approval progress for a privilege request
 */
export async function getApprovalProgress(
  requestId: string
): Promise<ApprovalProgress> {
  const request = await prisma.privilegeRequest.findUnique({
    where: { id: requestId },
    include: {
      applicant: true,
      approvals: {
        include: {
          approver: true,
        },
      },
      requestedPrivileges: {
        include: {
          privilege: true,
        },
      },
    },
  });

  if (!request) {
    throw new Error(`Request not found: ${requestId}`);
  }

  // Determine if same specialty based on requested privileges
  const privilegeSpecialties = request.requestedPrivileges
    .map(rp => rp.privilege.requiredSpecialty)
    .filter(Boolean) as DentalSpecialty[];
  
  const sameSpecialty = privilegeSpecialties.length === 0 || 
    privilegeSpecialties.every(ps => 
      isSameSpecialty(
        request.applicant.specialty,
        ps,
        request.applicant.additionalSpecialties as DentalSpecialty[]
      )
    );

  // Get requirements
  const requirements = await getApprovalRequirements(
    request.applicant.practitionerType || PractitionerType.GP,
    request.requestType,
    sameSpecialty
  );

  // Count approvals by type
  const approvedApprovals = request.approvals.filter(a => a.status === ApprovalStatus.APPROVED);
  
  const consultantApprovals = approvedApprovals.filter(a => 
    a.approver.practitionerType === PractitionerType.CONSULTANT &&
    a.level !== ApprovalLevel.MEDICAL_DIRECTOR
  ).length;

  const committeeApproved = approvedApprovals.some(a => 
    a.level === ApprovalLevel.COMMITTEE
  );

  const medicalDirectorApproved = approvedApprovals.some(a => 
    a.level === ApprovalLevel.MEDICAL_DIRECTOR
  );

  // Determine if complete
  const consultantsComplete = consultantApprovals >= requirements.requiredConsultants;
  const committeeComplete = !requirements.requiresCommittee || committeeApproved;
  const mdComplete = !requirements.requiresMedicalDirector || medicalDirectorApproved;
  const isComplete = consultantsComplete && committeeComplete && mdComplete;

  // Determine next approval level
  let nextApprovalLevel: ApprovalLevel | null = null;
  if (!consultantsComplete) {
    nextApprovalLevel = ApprovalLevel.COMMITTEE; // Consultants are at committee level
  } else if (!committeeComplete) {
    nextApprovalLevel = ApprovalLevel.COMMITTEE;
  } else if (!mdComplete) {
    nextApprovalLevel = ApprovalLevel.MEDICAL_DIRECTOR;
  }

  // Get pending approvers
  const pendingApprovers = await getPendingApprovers(
    request,
    requirements,
    approvedApprovals
  );

  return {
    consultantApprovals,
    requiredConsultants: requirements.requiredConsultants,
    committeeApproved,
    requiresCommittee: requirements.requiresCommittee,
    medicalDirectorApproved,
    requiresMedicalDirector: requirements.requiresMedicalDirector,
    isComplete,
    nextApprovalLevel,
    pendingApprovers,
  };
}

/**
 * Get list of users who can approve a request
 */
async function getPendingApprovers(
  request: PrivilegeRequest & { 
    applicant: User; 
    approvals: (Approval & { approver: User })[];
    requestedPrivileges: { privilege: Privilege }[];
  },
  requirements: ApprovalRequirements,
  approvedApprovals: (Approval & { approver: User })[]
): Promise<PendingApprover[]> {
  const pendingApprovers: PendingApprover[] = [];
  const approvedUserIds = new Set(approvedApprovals.map(a => a.approverId));

  // Get required specialty for the privileges
  const privilegeSpecialties = request.requestedPrivileges
    .map(rp => rp.privilege.requiredSpecialty)
    .filter(Boolean) as DentalSpecialty[];
  
  const targetSpecialty = privilegeSpecialties[0]; // Primary specialty needed

  // 1. Get consultant approvers (from the required specialty)
  const consultantApprovals = approvedApprovals.filter(a => 
    a.approver.practitionerType === PractitionerType.CONSULTANT &&
    a.level !== ApprovalLevel.MEDICAL_DIRECTOR
  ).length;

  if (consultantApprovals < requirements.requiredConsultants) {
    // Find consultants who can approve
    const consultantQuery: Record<string, unknown> = {
      canApprovePrivileges: true,
      practitionerType: PractitionerType.CONSULTANT,
      id: {
        notIn: [...approvedUserIds, request.applicantId], // Exclude already approved and applicant
      },
    };

    // If same specialty, get consultants from that specialty
    if (targetSpecialty && requirements.sameSpecialty) {
      consultantQuery.OR = [
        { specialty: targetSpecialty },
        { additionalSpecialties: { has: targetSpecialty } },
      ];
    } else if (targetSpecialty) {
      // For different specialty, still prefer consultants from the privilege's specialty
      consultantQuery.OR = [
        { specialty: targetSpecialty },
        { additionalSpecialties: { has: targetSpecialty } },
      ];
    }

    const consultants = await prisma.user.findMany({
      where: consultantQuery,
      take: requirements.requiredConsultants - consultantApprovals + 2, // Get extras
    });

    pendingApprovers.push(...consultants.map(c => ({
      userId: c.id,
      email: c.email,
      nameEn: c.nameEn,
      nameAr: c.nameAr,
      specialty: c.specialty,
      role: c.role,
      level: ApprovalLevel.COMMITTEE,
    })));
  }

  // 2. Get committee approvers (if required)
  if (requirements.requiresCommittee && !approvedApprovals.some(a => a.level === ApprovalLevel.COMMITTEE)) {
    const committeeMembers = await prisma.user.findMany({
      where: {
        isCommitteeMember: true,
        id: {
          notIn: [...approvedUserIds, request.applicantId],
        },
      },
    });

    // Add committee members not already in the list
    const existingIds = new Set(pendingApprovers.map(p => p.userId));
    for (const member of committeeMembers) {
      if (!existingIds.has(member.id)) {
        pendingApprovers.push({
          userId: member.id,
          email: member.email,
          nameEn: member.nameEn,
          nameAr: member.nameAr,
          specialty: member.specialty,
          role: member.role,
          level: ApprovalLevel.COMMITTEE,
        });
      }
    }
  }

  // 3. Get Medical Director (if required and consultants/committee done)
  if (requirements.requiresMedicalDirector) {
    const consultantsComplete = consultantApprovals >= requirements.requiredConsultants;
    const committeeComplete = !requirements.requiresCommittee || 
      approvedApprovals.some(a => a.level === ApprovalLevel.COMMITTEE);

    if (consultantsComplete && committeeComplete) {
      const medicalDirector = await prisma.user.findFirst({
        where: {
          role: UserRole.MEDICAL_DIRECTOR,
          id: {
            notIn: [...approvedUserIds, request.applicantId],
          },
        },
      });

      if (medicalDirector) {
        pendingApprovers.push({
          userId: medicalDirector.id,
          email: medicalDirector.email,
          nameEn: medicalDirector.nameEn,
          nameAr: medicalDirector.nameAr,
          specialty: medicalDirector.specialty,
          role: medicalDirector.role,
          level: ApprovalLevel.MEDICAL_DIRECTOR,
        });
      }
    }
  }

  return pendingApprovers;
}

/**
 * Check if a user can approve a specific request
 */
export async function canUserApprove(
  userId: string,
  requestId: string
): Promise<{ canApprove: boolean; reason?: string; level?: ApprovalLevel }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return { canApprove: false, reason: 'User not found' };
  }

  if (!user.canApprovePrivileges) {
    return { canApprove: false, reason: 'User does not have approval privileges' };
  }

  const request = await prisma.privilegeRequest.findUnique({
    where: { id: requestId },
    include: {
      applicant: true,
    },
  });

  if (!request) {
    return { canApprove: false, reason: 'Request not found' };
  }

  // Can't approve own request
  if (request.applicantId === userId) {
    return { canApprove: false, reason: 'Cannot approve own request' };
  }

  // Check if already approved
  const existingApproval = await prisma.approval.findFirst({
    where: {
      requestId,
      approverId: userId,
      status: ApprovalStatus.APPROVED,
    },
  });

  if (existingApproval) {
    return { canApprove: false, reason: 'Already approved this request' };
  }

  // Get progress to see if this user's approval is needed
  const progress = await getApprovalProgress(requestId);

  // Medical Director can always approve if MD approval is needed
  if (user.role === UserRole.MEDICAL_DIRECTOR && !progress.medicalDirectorApproved) {
    return { canApprove: true, level: ApprovalLevel.MEDICAL_DIRECTOR };
  }

  // Check if user is in pending approvers list
  const isPending = progress.pendingApprovers.some(p => p.userId === userId);
  if (isPending) {
    const pendingApprover = progress.pendingApprovers.find(p => p.userId === userId);
    return { canApprove: true, level: pendingApprover?.level };
  }

  return { canApprove: false, reason: 'Your approval is not currently required for this request' };
}

/**
 * Process an approval and update request status
 */
export async function processApproval(
  requestId: string,
  approverId: string,
  status: 'APPROVED' | 'REJECTED',
  comments?: string
): Promise<{ success: boolean; newStatus: RequestStatus; message: string }> {
  // Check if user can approve
  const canApprove = await canUserApprove(approverId, requestId);
  if (!canApprove.canApprove) {
    return {
      success: false,
      newStatus: RequestStatus.IN_REVIEW,
      message: canApprove.reason || 'Cannot approve',
    };
  }

  // Create/update approval record
  const _approval = await prisma.approval.upsert({
    where: {
      requestId_level: {
        requestId,
        level: canApprove.level!,
      },
    },
    create: {
      requestId,
      approverId,
      level: canApprove.level!,
      status: status === 'APPROVED' ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED,
      comments,
      approvedAt: new Date(),
    },
    update: {
      approverId,
      status: status === 'APPROVED' ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED,
      comments,
      approvedAt: new Date(),
    },
  });

  // If rejected, reject the whole request
  if (status === 'REJECTED') {
    await prisma.privilegeRequest.update({
      where: { id: requestId },
      data: {
        status: RequestStatus.REJECTED,
        completedAt: new Date(),
      },
    });
    return {
      success: true,
      newStatus: RequestStatus.REJECTED,
      message: 'Request rejected',
    };
  }

  // Check if approval is now complete
  const progress = await getApprovalProgress(requestId);
  
  if (progress.isComplete) {
    await prisma.privilegeRequest.update({
      where: { id: requestId },
      data: {
        status: RequestStatus.APPROVED,
        completedAt: new Date(),
      },
    });
    return {
      success: true,
      newStatus: RequestStatus.APPROVED,
      message: 'Request fully approved',
    };
  }

  // Still in review
  await prisma.privilegeRequest.update({
    where: { id: requestId },
    data: {
      status: RequestStatus.IN_REVIEW,
    },
  });

  return {
    success: true,
    newStatus: RequestStatus.IN_REVIEW,
    message: `Approval recorded. ${progress.requiredConsultants - progress.consultantApprovals} more consultant approvals needed.`,
  };
}

/**
 * Auto-approve core privileges
 */
export async function autoApproveIfEligible(
  requestId: string
): Promise<{ autoApproved: boolean; reason?: string }> {
  const request = await prisma.privilegeRequest.findUnique({
    where: { id: requestId },
    include: {
      applicant: true,
    },
  });

  if (!request) {
    return { autoApproved: false, reason: 'Request not found' };
  }

  // Only auto-approve CORE privileges
  if (request.requestType !== PrivilegeRequestType.CORE) {
    return { autoApproved: false, reason: 'Only core privileges can be auto-approved' };
  }

  const requirements = await getApprovalRequirements(
    request.applicant.practitionerType || PractitionerType.GP,
    request.requestType,
    true // Core is always same specialty
  );

  if (!requirements.autoApprove) {
    return { autoApproved: false, reason: 'Auto-approval not enabled for this configuration' };
  }

  // Auto-approve
  await prisma.privilegeRequest.update({
    where: { id: requestId },
    data: {
      status: RequestStatus.APPROVED,
      completedAt: new Date(),
    },
  });

  return { autoApproved: true };
}
