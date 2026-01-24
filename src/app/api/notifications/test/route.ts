/**
 * CBAHI Clinical Privileges - Test Email API
 *
 * POST - Send a test email to verify email configuration
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { UserRole } from "@prisma/client";
import { emailService } from "@/lib/notifications/email";

// ============================================================================
// POST - Send Test Email
// ============================================================================

export async function POST(request: NextRequest) {
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
      select: { id: true, role: true, email: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found", message: "User profile not found" },
        { status: 404 }
      );
    }

    // Only admins can send test emails
    if (user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        {
          error: "Forbidden",
          message: "Only administrators can send test emails",
        },
        { status: 403 }
      );
    }

    // Get request body (optional - can specify recipient)
    const body = await request.json().catch(() => ({}));
    const recipientEmail = body.to || user.email;

    if (!recipientEmail) {
      return NextResponse.json(
        { error: "Invalid request", message: "No recipient email specified" },
        { status: 400 }
      );
    }

    // Send test email
    const result = await emailService.sendTestEmail(recipientEmail);

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Email failed",
          message: result.error || "Failed to send test email",
        },
        { status: 500 }
      );
    }

    // Log the test email
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "TEST_EMAIL_SENT",
        entityType: "email",
        newValues: {
          to: recipientEmail,
          messageId: result.messageId,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Test email sent successfully",
      data: {
        to: recipientEmail,
        messageId: result.messageId,
      },
    });
  } catch (error) {
    console.error("POST /api/notifications/test error:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Failed to send test email",
      },
      { status: 500 }
    );
  }
}
