/**
 * CBAHI Clinical Privileges - Escalation Cron API
 *
 * GET/POST - Process pending escalations
 *            Called by Railway cron or external scheduler
 *            Vercel/Railway cron secret header validation
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { EscalationStatus, NotificationType } from "@prisma/client";

// ============================================================================
// Types
// ============================================================================

interface EscalationThresholds {
  level1Days: number;
  level2Days: number;
  level3Days: number;
}

interface EscalationResult {
  escalationId: string;
  requestId: string;
  approverId: string;
  approverName: string;
  level: 1 | 2 | 3;
  action: "notified" | "skipped" | "error";
  message?: string;
}

// Default thresholds if not configured
const DEFAULT_THRESHOLDS: EscalationThresholds = {
  level1Days: 3,
  level2Days: 5,
  level3Days: 7,
};

// ============================================================================
// Cron Secret Validation
// ============================================================================

function validateCronSecret(request: NextRequest): boolean {
  // Check for various cron secret headers
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    // If no secret is configured, allow in development
    return process.env.NODE_ENV === "development";
  }

  // Check Authorization header
  const authHeader = request.headers.get("Authorization");
  if (authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  // Check x-cron-secret header (Railway)
  const xCronSecret = request.headers.get("x-cron-secret");
  if (xCronSecret === cronSecret) {
    return true;
  }

  // Check Vercel cron secret
  const vercelCronSecret = request.headers.get("x-vercel-cron-secret");
  if (vercelCronSecret === cronSecret) {
    return true;
  }

  return false;
}

// ============================================================================
// GET - Process Escalations (for scheduler compatibility)
// ============================================================================

export async function GET(request: NextRequest) {
  return processEscalations(request);
}

// ============================================================================
// POST - Process Escalations
// ============================================================================

export async function POST(request: NextRequest) {
  return processEscalations(request);
}

// ============================================================================
// Main Processing Function
// ============================================================================

async function processEscalations(request: NextRequest) {
  try {
    // Validate cron secret
    if (!validateCronSecret(request)) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Invalid or missing cron secret" },
        { status: 401 }
      );
    }

    // Get system settings
    const settings = await prisma.systemSettings.findUnique({
      where: { id: "default" },
      select: {
        escalationEnabled: true,
        escalationThresholds: true,
        escalationHrEmail: true,
        testingMode: true,
        testEmail: true,
      },
    });

    // Check if escalation is enabled
    if (!settings?.escalationEnabled) {
      return NextResponse.json({
        message: "Escalation is disabled",
        processed: 0,
      });
    }

    // Get thresholds
    const thresholds: EscalationThresholds = (settings.escalationThresholds as unknown as EscalationThresholds) || DEFAULT_THRESHOLDS;

    // Get active escalations
    const activeEscalations = await prisma.escalation.findMany({
      where: {
        status: EscalationStatus.ACTIVE,
      },
      include: {
        request: {
          select: {
            id: true,
            status: true,
            applicant: {
              select: {
                id: true,
                nameEn: true,
                email: true,
              },
            },
          },
        },
        approver: {
          select: {
            id: true,
            nameEn: true,
            email: true,
            lineManager: {
              select: {
                id: true,
                nameEn: true,
                email: true,
              },
            },
          },
        },
        approval: {
          select: {
            id: true,
            level: true,
            status: true,
          },
        },
      },
    });

    const results: EscalationResult[] = [];
    const now = new Date();

    for (const escalation of activeEscalations) {
      // Skip if approval is no longer pending
      if (escalation.approval.status !== "PENDING") {
        await prisma.escalation.update({
          where: { id: escalation.id },
          data: {
            status: EscalationStatus.RESOLVED,
            resolvedAt: now,
            notes: "Approval processed",
          },
        });
        continue;
      }

      // Skip if request is no longer pending/in-review
      if (!["PENDING", "IN_REVIEW"].includes(escalation.request.status)) {
        await prisma.escalation.update({
          where: { id: escalation.id },
          data: {
            status: EscalationStatus.RESOLVED,
            resolvedAt: now,
            notes: "Request completed",
          },
        });
        continue;
      }

      // Calculate days since received
      const daysSinceReceived = Math.floor(
        (now.getTime() - new Date(escalation.receivedAt).getTime()) /
          (1000 * 60 * 60 * 24)
      );

      // Determine which escalation level to send
      let result: EscalationResult | null = null;

      // Level 3 - HR Escalation
      if (
        daysSinceReceived >= thresholds.level3Days &&
        !escalation.level3Sent &&
        settings.escalationHrEmail
      ) {
        result = await sendLevel3Escalation(
          escalation,
          settings.escalationHrEmail,
          settings.testingMode ? settings.testEmail : null
        );
      }
      // Level 2 - Line Manager Escalation
      else if (
        daysSinceReceived >= thresholds.level2Days &&
        !escalation.level2Sent
      ) {
        result = await sendLevel2Escalation(
          escalation,
          settings.testingMode ? settings.testEmail : null
        );
      }
      // Level 1 - Reminder to Approver
      else if (
        daysSinceReceived >= thresholds.level1Days &&
        !escalation.level1Sent
      ) {
        result = await sendLevel1Escalation(
          escalation,
          settings.testingMode ? settings.testEmail : null
        );
      }

      if (result) {
        results.push(result);
      }
    }

    // Log processing
    await prisma.auditLog.create({
      data: {
        action: "ESCALATION_CRON",
        entityType: "escalations",
        newValues: {
          processed: results.length,
          activeEscalations: activeEscalations.length,
          results: results.map((r) => ({
            escalationId: r.escalationId,
            level: r.level,
            action: r.action,
          })),
        },
      },
    });

    return NextResponse.json({
      message: "Escalation processing completed",
      processed: results.length,
      results,
      statistics: {
        totalActive: activeEscalations.length,
        level1Sent: results.filter((r) => r.level === 1 && r.action === "notified").length,
        level2Sent: results.filter((r) => r.level === 2 && r.action === "notified").length,
        level3Sent: results.filter((r) => r.level === 3 && r.action === "notified").length,
        errors: results.filter((r) => r.action === "error").length,
      },
    });
  } catch (error) {
    console.error("Escalation cron error:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: "Failed to process escalations",
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// Escalation Level Handlers
// ============================================================================

interface EscalationWithRelations {
  id: string;
  requestId: string;
  approverId: string;
  approvalId: string;
  receivedAt: Date;
  level1Sent: boolean;
  level2Sent: boolean;
  level2ManagerEmail: string | null;
  level3Sent: boolean;
  request: {
    id: string;
    status: string;
    applicant: {
      id: string;
      nameEn: string;
      email: string;
    };
  };
  approver: {
    id: string;
    nameEn: string;
    email: string;
    lineManager: {
      id: string;
      nameEn: string;
      email: string;
    } | null;
  };
  approval: {
    id: string;
    level: string;
    status: string;
  };
}

/**
 * Send Level 1 Escalation - Reminder to approver
 */
async function sendLevel1Escalation(
  escalation: EscalationWithRelations,
  testEmail: string | null
): Promise<EscalationResult> {
  try {
    const recipientEmail = testEmail || escalation.approver.email;

    // Create notification
    await prisma.notificationLog.create({
      data: {
        requestId: escalation.requestId,
        type: NotificationType.ESCALATION_LEVEL1,
        recipientEmail,
        recipientName: escalation.approver.nameEn,
        subject: `Reminder: Clinical Privilege Request Awaiting Your Approval - ${escalation.request.applicant.nameEn}`,
        status: "PENDING",
        metadata: {
          escalationId: escalation.id,
          approvalLevel: escalation.approval.level,
          applicantName: escalation.request.applicant.nameEn,
          daysPending: Math.floor(
            (Date.now() - new Date(escalation.receivedAt).getTime()) /
              (1000 * 60 * 60 * 24)
          ),
        },
      },
    });

    // Update escalation
    await prisma.escalation.update({
      where: { id: escalation.id },
      data: {
        level1Sent: true,
        level1SentAt: new Date(),
      },
    });

    return {
      escalationId: escalation.id,
      requestId: escalation.requestId,
      approverId: escalation.approverId,
      approverName: escalation.approver.nameEn,
      level: 1,
      action: "notified",
    };
  } catch (error) {
    console.error("Level 1 escalation error:", error);
    return {
      escalationId: escalation.id,
      requestId: escalation.requestId,
      approverId: escalation.approverId,
      approverName: escalation.approver.nameEn,
      level: 1,
      action: "error",
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Send Level 2 Escalation - Notify line manager
 */
async function sendLevel2Escalation(
  escalation: EscalationWithRelations,
  testEmail: string | null
): Promise<EscalationResult> {
  try {
    const lineManager = escalation.approver.lineManager;

    if (!lineManager) {
      // No line manager, mark as sent but skip
      await prisma.escalation.update({
        where: { id: escalation.id },
        data: {
          level2Sent: true,
          level2SentAt: new Date(),
          notes: "No line manager found",
        },
      });

      return {
        escalationId: escalation.id,
        requestId: escalation.requestId,
        approverId: escalation.approverId,
        approverName: escalation.approver.nameEn,
        level: 2,
        action: "skipped",
        message: "No line manager found",
      };
    }

    const recipientEmail = testEmail || lineManager.email;

    // Create notification for line manager
    await prisma.notificationLog.create({
      data: {
        requestId: escalation.requestId,
        type: NotificationType.ESCALATION_LEVEL2,
        recipientEmail,
        recipientName: lineManager.nameEn,
        subject: `Escalation: Pending Clinical Privilege Approval - ${escalation.approver.nameEn}`,
        status: "PENDING",
        metadata: {
          escalationId: escalation.id,
          approverName: escalation.approver.nameEn,
          approverEmail: escalation.approver.email,
          approvalLevel: escalation.approval.level,
          applicantName: escalation.request.applicant.nameEn,
          daysPending: Math.floor(
            (Date.now() - new Date(escalation.receivedAt).getTime()) /
              (1000 * 60 * 60 * 24)
          ),
        },
      },
    });

    // Update escalation
    await prisma.escalation.update({
      where: { id: escalation.id },
      data: {
        level2Sent: true,
        level2SentAt: new Date(),
        level2ManagerId: lineManager.id,
        level2ManagerEmail: lineManager.email,
      },
    });

    return {
      escalationId: escalation.id,
      requestId: escalation.requestId,
      approverId: escalation.approverId,
      approverName: escalation.approver.nameEn,
      level: 2,
      action: "notified",
    };
  } catch (error) {
    console.error("Level 2 escalation error:", error);
    return {
      escalationId: escalation.id,
      requestId: escalation.requestId,
      approverId: escalation.approverId,
      approverName: escalation.approver.nameEn,
      level: 2,
      action: "error",
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Send Level 3 Escalation - Notify HR
 */
async function sendLevel3Escalation(
  escalation: EscalationWithRelations,
  hrEmail: string,
  testEmail: string | null
): Promise<EscalationResult> {
  try {
    const recipientEmail = testEmail || hrEmail;

    // Create notification for HR
    await prisma.notificationLog.create({
      data: {
        requestId: escalation.requestId,
        type: NotificationType.ESCALATION_LEVEL3,
        recipientEmail,
        recipientName: "HR Department",
        subject: `HR Escalation: Severely Delayed Clinical Privilege Approval - ${escalation.approver.nameEn}`,
        status: "PENDING",
        metadata: {
          escalationId: escalation.id,
          approverName: escalation.approver.nameEn,
          approverEmail: escalation.approver.email,
          approvalLevel: escalation.approval.level,
          applicantName: escalation.request.applicant.nameEn,
          daysPending: Math.floor(
            (Date.now() - new Date(escalation.receivedAt).getTime()) /
              (1000 * 60 * 60 * 24)
          ),
          lineManagerNotified: escalation.level2Sent,
          lineManagerEmail: escalation.level2ManagerEmail,
        },
      },
    });

    // Update escalation
    await prisma.escalation.update({
      where: { id: escalation.id },
      data: {
        level3Sent: true,
        level3SentAt: new Date(),
      },
    });

    return {
      escalationId: escalation.id,
      requestId: escalation.requestId,
      approverId: escalation.approverId,
      approverName: escalation.approver.nameEn,
      level: 3,
      action: "notified",
    };
  } catch (error) {
    console.error("Level 3 escalation error:", error);
    return {
      escalationId: escalation.id,
      requestId: escalation.requestId,
      approverId: escalation.approverId,
      approverName: escalation.approver.nameEn,
      level: 3,
      action: "error",
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
