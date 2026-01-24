/**
 * Debug endpoint to check current session data
 * REMOVE IN PRODUCTION
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({
        error: "No session",
        message: "No active session found",
      });
    }

    // Get user from database to compare
    const dbUser = session.user?.email
      ? await prisma.user.findUnique({
          where: { email: session.user.email },
          select: {
            id: true,
            email: true,
            nameEn: true,
            nameAr: true,
            role: true,
            departmentEn: true,
          },
        })
      : null;

    return NextResponse.json({
      sessionUser: session.user,
      databaseUser: dbUser,
      match: dbUser?.id === session.user?.id,
      sessionUserId: session.user?.id,
      dbUserId: dbUser?.id,
    });
  } catch (error) {
    console.error("Debug session error:", error);
    return NextResponse.json({
      error: "Error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
