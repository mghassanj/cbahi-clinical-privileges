/**
 * CBAHI Clinical Privileges - Approvals API
 *
 * GET - List pending approvals for current user
 *       Include request details, applicant info
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { ApprovalStatus, UserRole, Prisma } from "@prisma/client";

// ============================================================================
// Types
// ============================================================================

interface ListApprovalsParams {
  status?: ApprovalStatus | ApprovalStatus[];
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// ============================================================================
// GET - List Pending Approvals
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Please sign in to continue" },
        { status: 401 }
      );
    }

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

    // Only approvers can view approvals queue
    const approverRoles = [
      UserRole.HEAD_OF_SECTION,
      UserRole.HEAD_OF_DEPT,
      UserRole.COMMITTEE_MEMBER,
      UserRole.MEDICAL_DIRECTOR,
      UserRole.ADMIN,
    ];

    if (!approverRoles.includes(user.role)) {
      return NextResponse.json(
        {
          error: "Forbidden",
          message: "You do not have permission to view approvals",
        },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const params: ListApprovalsParams = {
      status: searchParams.get("status") as ApprovalStatus | undefined,
      page: parseInt(searchParams.get("page") || "1"),
      limit: Math.min(parseInt(searchParams.get("limit") || "20"), 100),
      sortBy: searchParams.get("sortBy") || "createdAt",
      sortOrder: (searchParams.get("sortOrder") as "asc" | "desc") || "desc",
    };

    // Handle multiple status values
    const statusParam = searchParams.getAll("status");
    if (statusParam.length > 1) {
      params.status = statusParam as ApprovalStatus[];
    }

    // Build where clause
    const where: Prisma.ApprovalWhereInput = {};

    // Filter by current user (unless admin viewing all)
    if (user.role !== UserRole.ADMIN || !searchParams.get("all")) {
      where.approverId = user.id;
    }

    // Status filter (default to pending)
    if (params.status) {
      if (Array.isArray(params.status)) {
        where.status = { in: params.status };
      } else {
        where.status = params.status;
      }
    } else {
      // Default to pending approvals
      where.status = ApprovalStatus.PENDING;
    }

    // Only show approvals for requests that are pending/in-review
    where.request = {
      status: { in: ["PENDING", "IN_REVIEW"] },
    };

    // Calculate pagination
    const skip = (params.page! - 1) * params.limit!;

    // Build orderBy
    const orderBy: Prisma.ApprovalOrderByWithRelationInput = {
      [params.sortBy!]: params.sortOrder,
    };

    // Execute queries
    const [approvals, total] = await Promise.all([
      prisma.approval.findMany({
        where,
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
              _count: {
                select: {
                  attachments: true,
                },
              },
            },
          },
          approver: {
            select: {
              id: true,
              nameEn: true,
              nameAr: true,
              role: true,
            },
          },
          escalations: {
            select: {
              id: true,
              level1Sent: true,
              level1SentAt: true,
              level2Sent: true,
              level2SentAt: true,
              level3Sent: true,
              level3SentAt: true,
              status: true,
            },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        orderBy,
        skip,
        take: params.limit,
      }),
      prisma.approval.count({ where }),
    ]);

    // Calculate statistics
    const stats = await prisma.approval.groupBy({
      by: ["status"],
      where: {
        approverId: user.id,
        request: {
          status: { in: ["PENDING", "IN_REVIEW"] },
        },
      },
      _count: true,
    });

    const statistics = {
      pending: stats.find((s) => s.status === "PENDING")?._count || 0,
      approved: stats.find((s) => s.status === "APPROVED")?._count || 0,
      rejected: stats.find((s) => s.status === "REJECTED")?._count || 0,
    };

    // Add computed fields to approvals
    const enrichedApprovals = approvals.map((approval) => {
      const escalation = approval.escalations[0];
      return {
        ...approval,
        isEscalated: escalation?.level1Sent || false,
        escalationLevel: escalation
          ? escalation.level3Sent
            ? 3
            : escalation.level2Sent
            ? 2
            : escalation.level1Sent
            ? 1
            : 0
          : 0,
        daysPending: Math.floor(
          (Date.now() - new Date(approval.createdAt).getTime()) /
            (1000 * 60 * 60 * 24)
        ),
      };
    });

    return NextResponse.json({
      data: enrichedApprovals,
      statistics,
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.ceil(total / params.limit!),
        hasNext: skip + approvals.length < total,
        hasPrev: params.page! > 1,
      },
    });
  } catch (error) {
    console.error("GET /api/approvals error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to fetch approvals" },
      { status: 500 }
    );
  }
}
