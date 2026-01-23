/**
 * CBAHI Clinical Privileges - Single User API
 *
 * GET   - Get user profile
 * PATCH - Update own profile (SCFHS number only)
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { UserRole } from "@prisma/client";

// ============================================================================
// Types
// ============================================================================

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface UpdateProfileBody {
  scfhsNo?: string;
}

// ============================================================================
// GET - Get User Profile
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

    // Check if user can view this profile
    const canView =
      currentUser.id === id ||
      currentUser.role === UserRole.ADMIN ||
      currentUser.role === UserRole.MEDICAL_DIRECTOR;

    if (!canView) {
      return NextResponse.json(
        {
          error: "Forbidden",
          message: "You do not have permission to view this profile",
        },
        { status: 403 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        jisrEmployeeId: true,
        employeeCode: true,
        email: true,
        nameEn: true,
        nameAr: true,
        jobTitleId: true,
        jobTitleEn: true,
        jobTitleAr: true,
        departmentId: true,
        departmentEn: true,
        departmentAr: true,
        locationId: true,
        locationEn: true,
        locationAr: true,
        nationalityId: true,
        nationalityEn: true,
        nationalityAr: true,
        joiningDate: true,
        status: true,
        role: true,
        scfhsNo: true,
        isActive: true,
        lastSyncedAt: true,
        createdAt: true,
        updatedAt: true,
        lineManager: {
          select: {
            id: true,
            nameEn: true,
            nameAr: true,
            email: true,
            jobTitleEn: true,
            jobTitleAr: true,
          },
        },
        directReports: {
          select: {
            id: true,
            nameEn: true,
            nameAr: true,
            email: true,
            jobTitleEn: true,
            jobTitleAr: true,
          },
          where: {
            isActive: true,
          },
        },
        privilegeRequests: {
          select: {
            id: true,
            type: true,
            requestType: true,
            status: true,
            createdAt: true,
            submittedAt: true,
            completedAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        _count: {
          select: {
            privilegeRequests: true,
            approvals: true,
            directReports: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Not found", message: "User not found" },
        { status: 404 }
      );
    }

    // Add computed fields
    const response = {
      ...user,
      canEdit: currentUser.id === id,
      isOwnProfile: currentUser.id === id,
    };

    return NextResponse.json({ data: response });
  } catch (error) {
    console.error("GET /api/users/[id] error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

// ============================================================================
// PATCH - Update User Profile
// ============================================================================

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Please sign in to continue" },
        { status: 401 }
      );
    }

    const { id } = await params;

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

    // Users can only update their own profile (except admins)
    if (currentUser.id !== id && currentUser.role !== UserRole.ADMIN) {
      return NextResponse.json(
        {
          error: "Forbidden",
          message: "You can only update your own profile",
        },
        { status: 403 }
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, scfhsNo: true, nameEn: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "Not found", message: "User not found" },
        { status: 404 }
      );
    }

    const body: UpdateProfileBody = await request.json();

    // Validate SCFHS number format if provided
    if (body.scfhsNo !== undefined) {
      if (body.scfhsNo && !/^\d{2}-\d{6}$/.test(body.scfhsNo) && !/^\d{8,10}$/.test(body.scfhsNo)) {
        return NextResponse.json(
          {
            error: "Invalid SCFHS number",
            message: "SCFHS number must be in format XX-XXXXXX or 8-10 digits",
          },
          { status: 400 }
        );
      }

      // Check for duplicate SCFHS number
      if (body.scfhsNo) {
        const existingUser = await prisma.user.findFirst({
          where: {
            scfhsNo: body.scfhsNo,
            id: { not: id },
          },
        });

        if (existingUser) {
          return NextResponse.json(
            {
              error: "Duplicate SCFHS number",
              message: "This SCFHS number is already registered to another user",
            },
            { status: 409 }
          );
        }
      }
    }

    // Build update data (only allow SCFHS number update)
    const updateData: { scfhsNo?: string | null } = {};

    if (body.scfhsNo !== undefined) {
      updateData.scfhsNo = body.scfhsNo || null;
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        {
          error: "No updates",
          message: "No valid fields to update",
        },
        { status: 400 }
      );
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        nameEn: true,
        email: true,
        scfhsNo: true,
        updatedAt: true,
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: currentUser.id,
        action: "UPDATE",
        entityType: "users",
        entityId: id,
        oldValues: { scfhsNo: targetUser.scfhsNo },
        newValues: updateData,
      },
    });

    return NextResponse.json({
      message: "Profile updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    console.error("PATCH /api/users/[id] error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to update profile" },
      { status: 500 }
    );
  }
}
