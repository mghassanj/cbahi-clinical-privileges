/**
 * CBAHI Clinical Privileges - Certificate API
 *
 * GET - Generate and return the certificate PDF for an approved request
 *
 * Access control:
 * - Applicant can download their own certificate
 * - Admins can download any certificate
 * - Approvers who participated in the approval chain can download
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { RequestStatus, UserRole } from "@prisma/client";
import {
  createCertificateGenerator,
  isEligibleForCertificate,
  getCertificateFilename,
  RequestForCertificate,
} from "@/lib/pdf/certificate-generator";

// ============================================================================
// Types
// ============================================================================

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ============================================================================
// Certificate Cache (In-memory for now, could be Redis in production)
// ============================================================================

const certificateCache = new Map<
  string,
  {
    buffer: Buffer;
    certificateNumber: string;
    generatedAt: Date;
  }
>();

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour cache

function getCachedCertificate(requestId: string) {
  const cached = certificateCache.get(requestId);
  if (!cached) return null;

  // Check if cache is still valid
  const now = new Date();
  const age = now.getTime() - cached.generatedAt.getTime();
  if (age > CACHE_TTL_MS) {
    certificateCache.delete(requestId);
    return null;
  }

  return cached;
}

function setCachedCertificate(
  requestId: string,
  buffer: Buffer,
  certificateNumber: string
) {
  certificateCache.set(requestId, {
    buffer,
    certificateNumber,
    generatedAt: new Date(),
  });
}

// ============================================================================
// GET - Generate and Download Certificate
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

    // Get current user
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

    // Fetch the privilege request with all required data
    const privilegeRequest = await prisma.privilegeRequest.findUnique({
      where: { id: requestId },
      include: {
        applicant: {
          select: {
            id: true,
            nameEn: true,
            nameAr: true,
            employeeCode: true,
            scfhsNo: true,
            departmentEn: true,
            departmentAr: true,
            jobTitleEn: true,
            jobTitleAr: true,
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
                jobTitleEn: true,
                jobTitleAr: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
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
    const isApplicant = privilegeRequest.applicantId === user.id;
    const isAdmin = user.role === UserRole.ADMIN;
    const isMedicalDirector = user.role === UserRole.MEDICAL_DIRECTOR;
    const isApprover = privilegeRequest.approvals.some(
      (a) => a.approverId === user.id
    );

    const canAccess = isApplicant || isAdmin || isMedicalDirector || isApprover;

    if (!canAccess) {
      return NextResponse.json(
        {
          error: "Forbidden",
          message: "You do not have permission to access this certificate",
        },
        { status: 403 }
      );
    }

    // Check if request is approved
    if (privilegeRequest.status !== RequestStatus.APPROVED) {
      return NextResponse.json(
        {
          error: "Not eligible",
          message: "Certificate is only available for fully approved requests",
        },
        { status: 400 }
      );
    }

    // Transform the request data to match expected type
    const requestData: RequestForCertificate = {
      id: privilegeRequest.id,
      type: privilegeRequest.type,
      requestType: privilegeRequest.requestType,
      hospitalCenter: privilegeRequest.hospitalCenter,
      status: privilegeRequest.status,
      createdAt: privilegeRequest.createdAt,
      completedAt: privilegeRequest.completedAt,
      applicant: {
        id: privilegeRequest.applicant.id,
        nameEn: privilegeRequest.applicant.nameEn,
        nameAr: privilegeRequest.applicant.nameAr,
        employeeCode: privilegeRequest.applicant.employeeCode,
        scfhsNo: privilegeRequest.applicant.scfhsNo,
        departmentEn: privilegeRequest.applicant.departmentEn,
        departmentAr: privilegeRequest.applicant.departmentAr,
        jobTitleEn: privilegeRequest.applicant.jobTitleEn,
        jobTitleAr: privilegeRequest.applicant.jobTitleAr,
      },
      requestedPrivileges: privilegeRequest.requestedPrivileges.map((rp) => ({
        id: rp.id,
        status: rp.status,
        privilege: {
          id: rp.privilege.id,
          code: rp.privilege.code,
          nameEn: rp.privilege.nameEn,
          nameAr: rp.privilege.nameAr,
          category: rp.privilege.category,
        },
      })),
      approvals: privilegeRequest.approvals.map((a) => ({
        id: a.id,
        level: a.level,
        status: a.status,
        approvedAt: a.approvedAt,
        approver: {
          id: a.approver.id,
          nameEn: a.approver.nameEn,
          nameAr: a.approver.nameAr,
          role: a.approver.role,
          jobTitleEn: a.approver.jobTitleEn,
          jobTitleAr: a.approver.jobTitleAr,
        },
      })),
    };

    // Check eligibility
    if (!isEligibleForCertificate(requestData)) {
      return NextResponse.json(
        {
          error: "Not eligible",
          message: "Request is not eligible for certificate generation",
        },
        { status: 400 }
      );
    }

    // Check cache first
    const cached = getCachedCertificate(requestId);
    if (cached) {
      const filename = getCertificateFilename(
        cached.certificateNumber,
        requestData.applicant.nameEn
      );

      // Convert Buffer to Uint8Array for NextResponse compatibility
      const uint8Array = new Uint8Array(cached.buffer);

      return new NextResponse(uint8Array, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Content-Length": cached.buffer.length.toString(),
          "Cache-Control": "private, max-age=3600",
        },
      });
    }

    // Generate certificate
    const generator = createCertificateGenerator({ validityYears: 2 });
    const result = await generator.generateCertificate(requestData);

    if (!result.success || !result.pdfBuffer) {
      console.error("Certificate generation failed:", result.error);
      return NextResponse.json(
        {
          error: "Generation failed",
          message: result.error || "Failed to generate certificate",
        },
        { status: 500 }
      );
    }

    // Cache the result
    setCachedCertificate(requestId, result.pdfBuffer, result.certificateNumber!);

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "DOWNLOAD",
        entityType: "certificate",
        entityId: requestId,
        newValues: {
          certificateNumber: result.certificateNumber,
          downloadedBy: user.id,
        },
      },
    });

    // Return PDF
    const filename = getCertificateFilename(
      result.certificateNumber!,
      requestData.applicant.nameEn
    );

    // Convert Buffer to Uint8Array for NextResponse compatibility
    const uint8Array = new Uint8Array(result.pdfBuffer);

    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": result.pdfBuffer.length.toString(),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("GET /api/requests/[id]/certificate error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to generate certificate" },
      { status: 500 }
    );
  }
}

// ============================================================================
// HEAD - Check Certificate Availability
// ============================================================================

export async function HEAD(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return new NextResponse(null, { status: 401 });
    }

    const { id: requestId } = await params;

    // Quick check if request exists and is approved
    const privilegeRequest = await prisma.privilegeRequest.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        status: true,
        applicantId: true,
        approvals: {
          select: {
            approverId: true,
            status: true,
          },
        },
      },
    });

    if (!privilegeRequest) {
      return new NextResponse(null, { status: 404 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true },
    });

    if (!user) {
      return new NextResponse(null, { status: 404 });
    }

    // Check access
    const isApplicant = privilegeRequest.applicantId === user.id;
    const isAdmin = user.role === UserRole.ADMIN;
    const isMedicalDirector = user.role === UserRole.MEDICAL_DIRECTOR;
    const isApprover = privilegeRequest.approvals.some(
      (a) => a.approverId === user.id
    );

    if (!(isApplicant || isAdmin || isMedicalDirector || isApprover)) {
      return new NextResponse(null, { status: 403 });
    }

    // Check if approved
    if (privilegeRequest.status !== RequestStatus.APPROVED) {
      return new NextResponse(null, { status: 400 });
    }

    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error("HEAD /api/requests/[id]/certificate error:", error);
    return new NextResponse(null, { status: 500 });
  }
}
