/**
 * CBAHI Clinical Privileges - Privilege Requests API
 *
 * GET  - List requests with filters (status, applicantId, dateRange)
 * POST - Create new request (as draft or submit)
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  RequestStatus,
  RequestType,
  PrivilegeRequestType,
  UserRole,
  Prisma,
} from "@prisma/client";

// ============================================================================
// Types
// ============================================================================

interface CreateRequestBody {
  type?: RequestType;
  requestType?: PrivilegeRequestType;
  reapplicationReason?: string;
  hospitalCenter?: string;
  currentJob?: string;
  privileges?: string[]; // Array of privilege IDs
  submit?: boolean; // If true, submit immediately instead of saving as draft
}

interface ListRequestsParams {
  status?: RequestStatus | RequestStatus[];
  applicantId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// ============================================================================
// GET - List Requests
// ============================================================================

export async function GET(request: NextRequest) {
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
      select: { id: true, role: true, departmentId: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found", message: "User profile not found" },
        { status: 404 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const params: ListRequestsParams = {
      status: searchParams.get("status") as RequestStatus | undefined,
      applicantId: searchParams.get("applicantId") || undefined,
      dateFrom: searchParams.get("dateFrom") || undefined,
      dateTo: searchParams.get("dateTo") || undefined,
      page: parseInt(searchParams.get("page") || "1"),
      limit: Math.min(parseInt(searchParams.get("limit") || "20"), 100),
      sortBy: searchParams.get("sortBy") || "createdAt",
      sortOrder: (searchParams.get("sortOrder") as "asc" | "desc") || "desc",
    };

    // Handle multiple status values
    const statusParam = searchParams.getAll("status");
    if (statusParam.length > 1) {
      params.status = statusParam as RequestStatus[];
    }

    // Build where clause based on user role
    const where: Prisma.PrivilegeRequestWhereInput = {};

    // Role-based filtering
    if (user.role === UserRole.EMPLOYEE) {
      // Employees can only see their own requests
      where.applicantId = user.id;
    } else if (user.role === UserRole.ADMIN || user.role === UserRole.MEDICAL_DIRECTOR) {
      // Admins and Medical Directors can see all requests
      if (params.applicantId) {
        where.applicantId = params.applicantId;
      }
    } else if (
      user.role === UserRole.HEAD_OF_DEPT ||
      user.role === UserRole.HEAD_OF_SECTION ||
      user.role === UserRole.COMMITTEE_MEMBER
    ) {
      // Approvers see requests in their approval queue OR their own requests
      if (params.applicantId) {
        where.applicantId = params.applicantId;
      } else {
        where.OR = [
          { applicantId: user.id },
          {
            approvals: {
              some: {
                approverId: user.id,
              },
            },
          },
        ];
      }
    }

    // Status filter
    if (params.status) {
      if (Array.isArray(params.status)) {
        where.status = { in: params.status };
      } else {
        where.status = params.status;
      }
    }

    // Date range filter
    if (params.dateFrom || params.dateTo) {
      where.createdAt = {};
      if (params.dateFrom) {
        where.createdAt.gte = new Date(params.dateFrom);
      }
      if (params.dateTo) {
        where.createdAt.lte = new Date(params.dateTo);
      }
    }

    // Calculate pagination
    const skip = (params.page! - 1) * params.limit!;

    // Build orderBy
    const orderBy: Prisma.PrivilegeRequestOrderByWithRelationInput = {
      [params.sortBy!]: params.sortOrder,
    };

    // Execute queries
    const [requests, total] = await Promise.all([
      prisma.privilegeRequest.findMany({
        where,
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
                },
              },
            },
            orderBy: { createdAt: "asc" },
          },
          _count: {
            select: {
              attachments: true,
            },
          },
        },
        orderBy,
        skip,
        take: params.limit,
      }),
      prisma.privilegeRequest.count({ where }),
    ]);

    return NextResponse.json({
      data: requests,
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.ceil(total / params.limit!),
        hasNext: skip + requests.length < total,
        hasPrev: params.page! > 1,
      },
    });
  } catch (error) {
    console.error("GET /api/requests error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to fetch requests" },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST - Create Request
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
      select: {
        id: true,
        role: true,
        status: true,
        isActive: true,
        nameEn: true,
        employeeCode: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found", message: "User profile not found" },
        { status: 404 }
      );
    }

    if (!user.isActive || user.status !== "ACTIVE") {
      return NextResponse.json(
        {
          error: "Account inactive",
          message: "Your account is not active. Please contact administrator.",
        },
        { status: 403 }
      );
    }

    const body: CreateRequestBody = await request.json();

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

    // Check for existing draft or pending request
    const existingRequest = await prisma.privilegeRequest.findFirst({
      where: {
        applicantId: user.id,
        status: { in: [RequestStatus.DRAFT, RequestStatus.PENDING, RequestStatus.IN_REVIEW] },
      },
    });

    if (existingRequest) {
      return NextResponse.json(
        {
          error: "Request exists",
          message: "You already have an active privilege request. Please complete or cancel it first.",
          existingRequestId: existingRequest.id,
        },
        { status: 409 }
      );
    }

    // Create the request with privileges
    const newRequest = await prisma.$transaction(async (tx) => {
      // Create the privilege request
      const createdRequest = await tx.privilegeRequest.create({
        data: {
          applicantId: user.id,
          type: body.type || RequestType.NEW,
          requestType: body.requestType || PrivilegeRequestType.CORE,
          reapplicationReason: body.reapplicationReason,
          hospitalCenter: body.hospitalCenter,
          currentJob: body.currentJob,
          status: body.submit ? RequestStatus.PENDING : RequestStatus.DRAFT,
          submittedAt: body.submit ? new Date() : null,
        },
      });

      // Add requested privileges
      if (body.privileges && body.privileges.length > 0) {
        await tx.requestedPrivilege.createMany({
          data: body.privileges.map((privilegeId) => ({
            requestId: createdRequest.id,
            privilegeId,
          })),
        });
      }

      // If submitting, create approval chain
      if (body.submit) {
        await createApprovalChain(tx, createdRequest.id, user.id);
      }

      // Fetch the complete request with relations
      return tx.privilegeRequest.findUnique({
        where: { id: createdRequest.id },
        include: {
          applicant: {
            select: {
              id: true,
              nameEn: true,
              nameAr: true,
              email: true,
              employeeCode: true,
            },
          },
          requestedPrivileges: {
            include: {
              privilege: true,
            },
          },
          approvals: {
            include: {
              approver: {
                select: {
                  id: true,
                  nameEn: true,
                  role: true,
                },
              },
            },
          },
        },
      });
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "CREATE",
        entityType: "privilege_requests",
        entityId: newRequest?.id,
        newValues: {
          type: body.type,
          requestType: body.requestType,
          status: body.submit ? RequestStatus.PENDING : RequestStatus.DRAFT,
          privilegeCount: body.privileges?.length || 0,
        },
      },
    });

    return NextResponse.json(
      {
        message: body.submit
          ? "Request submitted successfully"
          : "Draft saved successfully",
        data: newRequest,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/requests error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to create request" },
      { status: 500 }
    );
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create approval chain based on department hierarchy
 */
async function createApprovalChain(
  tx: Prisma.TransactionClient,
  requestId: string,
  applicantId: string
) {
  // Get applicant's hierarchy
  const applicant = await tx.user.findUnique({
    where: { id: applicantId },
    include: {
      lineManager: true,
    },
  });

  if (!applicant) {
    throw new Error("Applicant not found");
  }

  // Find approvers based on role hierarchy
  // 1. Head of Section (if applicable)
  // 2. Head of Department
  // 3. Committee
  // 4. Medical Director

  const approvers: { approverId: string; level: "HEAD_OF_SECTION" | "HEAD_OF_DEPT" | "COMMITTEE" | "MEDICAL_DIRECTOR" }[] = [];

  // Get Head of Section if line manager has that role
  if (applicant.lineManager?.role === UserRole.HEAD_OF_SECTION) {
    approvers.push({
      approverId: applicant.lineManager.id,
      level: "HEAD_OF_SECTION",
    });
  }

  // Get Head of Department
  const headOfDept = await tx.user.findFirst({
    where: {
      role: UserRole.HEAD_OF_DEPT,
      departmentId: applicant.departmentId,
      isActive: true,
      status: "ACTIVE",
    },
  });

  if (headOfDept && headOfDept.id !== applicantId) {
    approvers.push({
      approverId: headOfDept.id,
      level: "HEAD_OF_DEPT",
    });
  }

  // Get Committee Member (first available)
  const committeeMember = await tx.user.findFirst({
    where: {
      role: UserRole.COMMITTEE_MEMBER,
      isActive: true,
      status: "ACTIVE",
    },
  });

  if (committeeMember) {
    approvers.push({
      approverId: committeeMember.id,
      level: "COMMITTEE",
    });
  }

  // Get Medical Director
  const medicalDirector = await tx.user.findFirst({
    where: {
      role: UserRole.MEDICAL_DIRECTOR,
      isActive: true,
      status: "ACTIVE",
    },
  });

  if (medicalDirector) {
    approvers.push({
      approverId: medicalDirector.id,
      level: "MEDICAL_DIRECTOR",
    });
  }

  // Create approval records
  if (approvers.length > 0) {
    await tx.approval.createMany({
      data: approvers.map((approver, index) => ({
        requestId,
        approverId: approver.approverId,
        level: approver.level,
        status: index === 0 ? "PENDING" : "PENDING", // First approver is active
      })),
    });

    // Create escalation record for first approval
    const firstApproval = await tx.approval.findFirst({
      where: { requestId },
      orderBy: { createdAt: "asc" },
    });

    if (firstApproval) {
      await tx.escalation.create({
        data: {
          requestId,
          approverId: approvers[0].approverId,
          approvalId: firstApproval.id,
          receivedAt: new Date(),
        },
      });
    }
  }
}
