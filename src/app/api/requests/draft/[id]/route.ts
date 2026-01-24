/**
 * CBAHI Clinical Privileges - Single Draft Request API
 *
 * GET    - Get draft details for loading into wizard
 * DELETE - Delete a draft
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { RequestStatus } from "@prisma/client";

// ============================================================================
// Types
// ============================================================================

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ============================================================================
// GET - Get Draft Details
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

    const { id } = await params;

    const draft = await prisma.privilegeRequest.findUnique({
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
            locationEn: true,
            locationAr: true,
          },
        },
        requestedPrivileges: {
          select: {
            privilegeId: true,
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
          },
        },
      },
    });

    if (!draft) {
      return NextResponse.json(
        { error: "Not Found", message: "Draft not found" },
        { status: 404 }
      );
    }

    // Verify ownership
    if (draft.applicantId !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden", message: "You cannot access this draft" },
        { status: 403 }
      );
    }

    // Check if it's actually a draft
    if (draft.status !== RequestStatus.DRAFT) {
      return NextResponse.json(
        { error: "Bad Request", message: "This request is not a draft" },
        { status: 400 }
      );
    }

    // Document data type
    interface DocData {
      id: string;
      name: string;
      type: string;
      size: number;
      url: string | null;
    }

    // Transform to wizard state format
    const wizardState: {
      currentStep: number;
      personalInfo: Record<string, string>;
      applicationType: Record<string, string>;
      privileges: { selectedPrivileges: string[] };
      documents: {
        educationCertificate: DocData | null;
        scfhsRegistration: DocData | null;
        nationalIdCopy: DocData | null;
        passportPhoto: DocData | null;
        additionalCertifications: DocData[];
        cvResume: DocData | null;
      };
      review: { agreedToTerms: boolean };
      isDraft: boolean;
      draftId: string;
    } = {
      currentStep: 0,
      personalInfo: {
        nameEn: draft.applicant.nameEn || "",
        nameAr: draft.applicant.nameAr || "",
        employeeCode: draft.applicant.employeeCode || "",
        department: draft.applicant.departmentEn || "",
        departmentAr: draft.applicant.departmentAr || "",
        jobTitle: draft.applicant.jobTitleEn || "",
        jobTitleAr: draft.applicant.jobTitleAr || "",
        location: draft.applicant.locationEn || "",
        locationAr: draft.applicant.locationAr || "",
        email: draft.applicant.email || "",
        hospitalCenter: draft.hospitalCenter || "",
      },
      applicationType: {
        applicationType: draft.type === "REAPPLICATION" ? "reapplication" : "new",
        reapplicationReason: draft.reapplicationReason || "",
      },
      privileges: {
        selectedPrivileges: draft.requestedPrivileges.map((p) => p.privilegeId),
      },
      documents: {
        educationCertificate: null,
        scfhsRegistration: null,
        nationalIdCopy: null,
        passportPhoto: null,
        additionalCertifications: [],
        cvResume: null,
      },
      review: {
        agreedToTerms: false,
      },
      isDraft: true,
      draftId: draft.id,
    };

    // Map attachments to document slots based on AttachmentType enum
    // Enum values: CV, MEDICAL_LICENSE, SCFHS_LICENSE, BOARD_CERTIFICATE,
    // SPECIALTY_CERTIFICATE, EXPERIENCE_LETTER, TRAINING_CERTIFICATE, OTHER
    for (const attachment of draft.attachments) {
      const docData = {
        id: attachment.id,
        name: attachment.fileName,
        type: attachment.mimeType,
        size: attachment.fileSize || 0,
        url: attachment.driveFileUrl,
      };

      switch (attachment.type) {
        case "BOARD_CERTIFICATE":
        case "SPECIALTY_CERTIFICATE":
          wizardState.documents.educationCertificate = docData;
          break;
        case "SCFHS_LICENSE":
          wizardState.documents.scfhsRegistration = docData;
          break;
        case "MEDICAL_LICENSE":
          wizardState.documents.nationalIdCopy = docData;
          break;
        case "CV":
          wizardState.documents.cvResume = docData;
          break;
        case "TRAINING_CERTIFICATE":
        case "EXPERIENCE_LETTER":
        case "OTHER":
          wizardState.documents.additionalCertifications.push(docData);
          break;
      }
    }

    return NextResponse.json(wizardState);
  } catch (error) {
    console.error("GET /api/requests/draft/[id] error:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Failed to load draft",
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE - Delete Draft
// ============================================================================

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Please sign in to continue" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const draft = await prisma.privilegeRequest.findUnique({
      where: { id },
      select: { id: true, applicantId: true, status: true },
    });

    if (!draft) {
      return NextResponse.json(
        { error: "Not Found", message: "Draft not found" },
        { status: 404 }
      );
    }

    // Verify ownership
    if (draft.applicantId !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden", message: "You cannot delete this draft" },
        { status: 403 }
      );
    }

    // Check if it's actually a draft
    if (draft.status !== RequestStatus.DRAFT) {
      return NextResponse.json(
        { error: "Bad Request", message: "Only drafts can be deleted" },
        { status: 400 }
      );
    }

    // Delete draft and related data
    await prisma.$transaction(async (tx) => {
      // Delete attachments
      await tx.attachment.deleteMany({ where: { requestId: id } });

      // Delete requested privileges
      await tx.requestedPrivilege.deleteMany({ where: { requestId: id } });

      // Delete the draft
      await tx.privilegeRequest.delete({ where: { id } });
    });

    return NextResponse.json({ message: "Draft deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/requests/draft/[id] error:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Failed to delete draft",
      },
      { status: 500 }
    );
  }
}
