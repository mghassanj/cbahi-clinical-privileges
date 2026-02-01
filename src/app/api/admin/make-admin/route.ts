/**
 * Temporary endpoint to make a user admin
 * Protected by CRON_SECRET
 * DELETE THIS AFTER USE
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { UserRole } from "@prisma/client";

const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const cronSecret = request.headers.get("x-cron-secret");
    if (!CRON_SECRET || cronSecret !== CRON_SECRET) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, nameEn: true, role: true }
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found", email },
        { status: 404 }
      );
    }

    if (user.role === UserRole.ADMIN) {
      return NextResponse.json({
        message: "User is already an admin",
        user: { email: user.email, name: user.nameEn, role: user.role }
      });
    }

    const updated = await prisma.user.update({
      where: { email },
      data: { role: UserRole.ADMIN },
      select: { id: true, email: true, nameEn: true, role: true }
    });

    return NextResponse.json({
      message: "User promoted to admin",
      user: { email: updated.email, name: updated.nameEn, role: updated.role }
    });
  } catch (error) {
    console.error("Error making user admin:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
