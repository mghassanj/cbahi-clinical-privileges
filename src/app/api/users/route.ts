/**
 * CBAHI Clinical Privileges - Users API
 *
 * GET   - List users (admin only, with filters)
 * PATCH - Update user role (admin only)
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UserRole, UserStatus, Prisma } from "@prisma/client";

// ============================================================================
// Types
// ============================================================================

interface ListUsersParams {
  search?: string;
  role?: UserRole | UserRole[];
  status?: UserStatus;
  departmentId?: number;
  locationId?: number;
  branchId?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

interface UpdateUserRoleBody {
  userId: string;
  role: UserRole;
}

// ============================================================================
// GET - List Users
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
      select: { id: true, role: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found", message: "User profile not found" },
        { status: 404 }
      );
    }

    // Only admins and medical directors can list all users
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.MEDICAL_DIRECTOR) {
      return NextResponse.json(
        {
          error: "Forbidden",
          message: "You do not have permission to list users",
        },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const params: ListUsersParams = {
      search: searchParams.get("search") || undefined,
      role: searchParams.get("role") as UserRole | undefined,
      status: searchParams.get("status") as UserStatus | undefined,
      departmentId: searchParams.get("departmentId")
        ? parseInt(searchParams.get("departmentId")!)
        : undefined,
      locationId: searchParams.get("locationId")
        ? parseInt(searchParams.get("locationId")!)
        : undefined,
      branchId: searchParams.get("branchId")
        ? parseInt(searchParams.get("branchId")!)
        : undefined,
      page: parseInt(searchParams.get("page") || "1"),
      limit: Math.min(parseInt(searchParams.get("limit") || "20"), 100),
      sortBy: searchParams.get("sortBy") || "nameEn",
      sortOrder: (searchParams.get("sortOrder") as "asc" | "desc") || "asc",
    };

    // Handle multiple role values
    const roleParam = searchParams.getAll("role");
    if (roleParam.length > 1) {
      params.role = roleParam as UserRole[];
    }

    // Build where clause
    const where: Prisma.UserWhereInput = {};

    // Search filter
    if (params.search) {
      where.OR = [
        { nameEn: { contains: params.search, mode: "insensitive" } },
        { nameAr: { contains: params.search, mode: "insensitive" } },
        { email: { contains: params.search, mode: "insensitive" } },
        { employeeCode: { contains: params.search, mode: "insensitive" } },
      ];
    }

    // Role filter
    if (params.role) {
      if (Array.isArray(params.role)) {
        where.role = { in: params.role };
      } else {
        where.role = params.role;
      }
    }

    // Status filter
    if (params.status) {
      where.status = params.status;
    }

    // Department filter
    if (params.departmentId) {
      where.departmentId = params.departmentId;
    }

    // Location filter
    if (params.locationId) {
      where.locationId = params.locationId;
    }

    // Branch filter
    if (params.branchId) {
      where.branchId = params.branchId;
    }

    // Calculate pagination
    const skip = (params.page! - 1) * params.limit!;

    // Build orderBy
    const orderBy: Prisma.UserOrderByWithRelationInput = {
      [params.sortBy!]: params.sortOrder,
    };

    // Execute queries
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          jisrEmployeeId: true,
          employeeCode: true,
          email: true,
          nameEn: true,
          nameAr: true,
          jobTitleEn: true,
          jobTitleAr: true,
          departmentId: true,
          departmentEn: true,
          departmentAr: true,
          locationId: true,
          locationEn: true,
          locationAr: true,
          branchId: true,
          branchEn: true,
          branchAr: true,
          nationalityEn: true,
          nationalityAr: true,
          // Document fields from Jisr
          documentType: true,
          nationalIdNumber: true,
          iqamaNumber: true,
          passportNumber: true,
          // Photo from Jisr
          photoUrl: true,
          joiningDate: true,
          status: true,
          role: true,
          scfhsNo: true,
          isActive: true,
          lastSyncedAt: true,
          createdAt: true,
          _count: {
            select: {
              privilegeRequests: true,
              approvals: true,
            },
          },
        },
        orderBy,
        skip,
        take: params.limit,
      }),
      prisma.user.count({ where }),
    ]);

    // Get role statistics
    const roleStats = await prisma.user.groupBy({
      by: ["role"],
      _count: true,
    });

    const statistics = {
      total,
      byRole: Object.fromEntries(
        roleStats.map((s) => [s.role, s._count])
      ),
    };

    return NextResponse.json({
      data: users,
      statistics,
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.ceil(total / params.limit!),
        hasNext: skip + users.length < total,
        hasPrev: params.page! > 1,
      },
    });
  } catch (error) {
    console.error("GET /api/users error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

// ============================================================================
// PATCH - Update User Role
// ============================================================================

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Please sign in to continue" },
        { status: 401 }
      );
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true },
    });

    if (!currentUser) {
      return NextResponse.json(
        { error: "User not found", message: "User profile not found" },
        { status: 404 }
      );
    }

    // Only admins can update roles
    if (currentUser.role !== UserRole.ADMIN) {
      return NextResponse.json(
        {
          error: "Forbidden",
          message: "Only administrators can update user roles",
        },
        { status: 403 }
      );
    }

    const body: UpdateUserRoleBody = await request.json();

    // Validate required fields
    if (!body.userId || !body.role) {
      return NextResponse.json(
        {
          error: "Invalid request",
          message: "userId and role are required",
        },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = Object.values(UserRole);
    if (!validRoles.includes(body.role)) {
      return NextResponse.json(
        {
          error: "Invalid role",
          message: `Role must be one of: ${validRoles.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Get target user
    const targetUser = await prisma.user.findUnique({
      where: { id: body.userId },
      select: { id: true, role: true, nameEn: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "Not found", message: "Target user not found" },
        { status: 404 }
      );
    }

    // Prevent self-demotion from admin
    if (
      body.userId === currentUser.id &&
      currentUser.role === UserRole.ADMIN &&
      body.role !== UserRole.ADMIN
    ) {
      return NextResponse.json(
        {
          error: "Cannot demote self",
          message: "You cannot remove your own admin privileges",
        },
        { status: 400 }
      );
    }

    // Update user role
    const updatedUser = await prisma.user.update({
      where: { id: body.userId },
      data: { role: body.role },
      select: {
        id: true,
        nameEn: true,
        email: true,
        role: true,
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: currentUser.id,
        action: "UPDATE_ROLE",
        entityType: "users",
        entityId: body.userId,
        oldValues: { role: targetUser.role },
        newValues: { role: body.role },
      },
    });

    return NextResponse.json({
      message: `Role updated successfully for ${updatedUser.nameEn}`,
      data: updatedUser,
    });
  } catch (error) {
    console.error("PATCH /api/users error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to update user role" },
      { status: 500 }
    );
  }
}
