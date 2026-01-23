/**
 * CBAHI Clinical Privileges - Jisr Sync API
 *
 * POST - Trigger manual sync (admin only)
 * GET  - Get sync status and last sync time
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { UserRole } from "@prisma/client";

// ============================================================================
// Types
// ============================================================================

interface SyncResult {
  entityType: string;
  status: "success" | "error";
  recordsTotal?: number;
  recordsAdded?: number;
  recordsUpdated?: number;
  recordsSkipped?: number;
  errorMessage?: string;
  duration?: number;
}

interface TriggerSyncBody {
  entities?: ("users" | "departments" | "locations")[];
  fullSync?: boolean;
}

// ============================================================================
// GET - Get Sync Status
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
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

    // Only admins can view sync status
    if (user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        {
          error: "Forbidden",
          message: "Only administrators can view sync status",
        },
        { status: 403 }
      );
    }

    // Get last sync logs for each entity type
    const [usersSync, departmentsSync, locationsSync] = await Promise.all([
      prisma.syncLog.findFirst({
        where: { entityType: "users" },
        orderBy: { startedAt: "desc" },
      }),
      prisma.syncLog.findFirst({
        where: { entityType: "departments" },
        orderBy: { startedAt: "desc" },
      }),
      prisma.syncLog.findFirst({
        where: { entityType: "locations" },
        orderBy: { startedAt: "desc" },
      }),
    ]);

    // Get system settings for sync configuration
    const settings = await prisma.systemSettings.findUnique({
      where: { id: "default" },
      select: {
        syncIntervalHours: true,
        jisrSlug: true,
        updatedAt: true,
      },
    });

    // Get recent sync logs
    const recentLogs = await prisma.syncLog.findMany({
      orderBy: { startedAt: "desc" },
      take: 20,
    });

    // Get sync statistics
    const stats = await prisma.$transaction([
      prisma.user.count(),
      prisma.department.count(),
      prisma.location.count(),
      prisma.user.count({ where: { isActive: true } }),
    ]);

    const lastSync = [usersSync, departmentsSync, locationsSync]
      .filter((s) => s?.completedAt)
      .sort((a, b) =>
        (b?.completedAt?.getTime() || 0) - (a?.completedAt?.getTime() || 0)
      )[0];

    // Check if sync is currently running
    const runningSync = await prisma.syncLog.findFirst({
      where: { status: "started" },
      orderBy: { startedAt: "desc" },
    });

    return NextResponse.json({
      data: {
        lastSync: lastSync?.completedAt || null,
        nextScheduledSync: settings?.syncIntervalHours
          ? new Date(
              (lastSync?.completedAt?.getTime() || Date.now()) +
                settings.syncIntervalHours * 60 * 60 * 1000
            )
          : null,
        isRunning: !!runningSync,
        runningEntity: runningSync?.entityType,
        syncConfig: {
          intervalHours: settings?.syncIntervalHours || 24,
          jisrConfigured: !!settings?.jisrSlug,
        },
        entityStatus: {
          users: {
            lastSync: usersSync?.completedAt || null,
            status: usersSync?.status || "never",
            recordsTotal: usersSync?.recordsTotal || 0,
            recordsAdded: usersSync?.recordsAdded || 0,
            recordsUpdated: usersSync?.recordsUpdated || 0,
            error: usersSync?.status === "failed" ? usersSync.errorMessage : null,
          },
          departments: {
            lastSync: departmentsSync?.completedAt || null,
            status: departmentsSync?.status || "never",
            recordsTotal: departmentsSync?.recordsTotal || 0,
            recordsAdded: departmentsSync?.recordsAdded || 0,
            recordsUpdated: departmentsSync?.recordsUpdated || 0,
            error: departmentsSync?.status === "failed" ? departmentsSync.errorMessage : null,
          },
          locations: {
            lastSync: locationsSync?.completedAt || null,
            status: locationsSync?.status || "never",
            recordsTotal: locationsSync?.recordsTotal || 0,
            recordsAdded: locationsSync?.recordsAdded || 0,
            recordsUpdated: locationsSync?.recordsUpdated || 0,
            error: locationsSync?.status === "failed" ? locationsSync.errorMessage : null,
          },
        },
        statistics: {
          totalUsers: stats[0],
          totalDepartments: stats[1],
          totalLocations: stats[2],
          activeUsers: stats[3],
        },
        recentLogs,
      },
    });
  } catch (error) {
    console.error("GET /api/sync error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to fetch sync status" },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST - Trigger Manual Sync
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
      select: { id: true, role: true, nameEn: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found", message: "User profile not found" },
        { status: 404 }
      );
    }

    // Only admins can trigger sync
    if (user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        {
          error: "Forbidden",
          message: "Only administrators can trigger sync",
        },
        { status: 403 }
      );
    }

    // Check if sync is already running
    const runningSync = await prisma.syncLog.findFirst({
      where: { status: "started" },
    });

    if (runningSync) {
      return NextResponse.json(
        {
          error: "Sync in progress",
          message: `A sync is already in progress for ${runningSync.entityType}`,
          startedAt: runningSync.startedAt,
        },
        { status: 409 }
      );
    }

    // Get system settings
    const settings = await prisma.systemSettings.findUnique({
      where: { id: "default" },
      select: {
        jisrAccessToken: true,
        jisrSlug: true,
      },
    });

    if (!settings?.jisrAccessToken || !settings?.jisrSlug) {
      return NextResponse.json(
        {
          error: "Jisr not configured",
          message: "Please configure Jisr integration settings first",
        },
        { status: 400 }
      );
    }

    const body: TriggerSyncBody = await request.json().catch(() => ({}));

    // Default to all entities if not specified
    const entitiesToSync = body.entities || ["departments", "locations", "users"];

    // Start sync process
    const results: SyncResult[] = [];

    for (const entityType of entitiesToSync) {
      const startTime = Date.now();

      // Create sync log entry
      const syncLog = await prisma.syncLog.create({
        data: {
          entityType,
          status: "started",
        },
      });

      try {
        // Note: In production, this would call the actual Jisr sync service
        // For now, we'll simulate the sync process
        const result = await simulateSync(entityType, settings.jisrSlug);

        // Update sync log with results
        await prisma.syncLog.update({
          where: { id: syncLog.id },
          data: {
            status: "completed",
            recordsTotal: result.total,
            recordsAdded: result.added,
            recordsUpdated: result.updated,
            recordsSkipped: result.skipped,
            completedAt: new Date(),
          },
        });

        results.push({
          entityType,
          status: "success",
          recordsTotal: result.total,
          recordsAdded: result.added,
          recordsUpdated: result.updated,
          recordsSkipped: result.skipped,
          duration: Date.now() - startTime,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";

        // Update sync log with error
        await prisma.syncLog.update({
          where: { id: syncLog.id },
          data: {
            status: "failed",
            errorMessage,
            completedAt: new Date(),
          },
        });

        results.push({
          entityType,
          status: "error",
          errorMessage,
          duration: Date.now() - startTime,
        });
      }
    }

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "SYNC_TRIGGERED",
        entityType: "sync",
        newValues: {
          entities: entitiesToSync,
          fullSync: body.fullSync || false,
          results: results.map((r) => ({
            entity: r.entityType,
            status: r.status,
            records: r.recordsTotal,
          })),
        },
      },
    });

    // Create notification for sync completion
    const hasErrors = results.some((r) => r.status === "error");
    await prisma.notificationLog.create({
      data: {
        type: hasErrors ? "SYNC_FAILED" : "SYNC_COMPLETED",
        recipientEmail: session.user.email || "",
        recipientName: user.nameEn,
        subject: hasErrors
          ? "Jisr Sync Completed with Errors"
          : "Jisr Sync Completed Successfully",
        status: "PENDING",
        metadata: { results: JSON.parse(JSON.stringify(results)) },
      },
    });

    return NextResponse.json({
      message: hasErrors
        ? "Sync completed with some errors"
        : "Sync completed successfully",
      results,
    });
  } catch (error) {
    console.error("POST /api/sync error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to trigger sync" },
      { status: 500 }
    );
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Simulate sync process (placeholder for actual Jisr integration)
 * In production, this would call the JisrService methods
 */
async function simulateSync(
  entityType: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _jisrSlug: string
): Promise<{
  total: number;
  added: number;
  updated: number;
  skipped: number;
}> {
  // Simulate some processing time
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Return simulated results
  // In production, this would be replaced with actual Jisr API calls
  switch (entityType) {
    case "users":
      const userCount = await prisma.user.count();
      return {
        total: userCount,
        added: 0,
        updated: Math.floor(Math.random() * 5),
        skipped: userCount - Math.floor(Math.random() * 5),
      };
    case "departments":
      const deptCount = await prisma.department.count();
      return {
        total: deptCount,
        added: 0,
        updated: Math.floor(Math.random() * 2),
        skipped: deptCount - Math.floor(Math.random() * 2),
      };
    case "locations":
      const locCount = await prisma.location.count();
      return {
        total: locCount,
        added: 0,
        updated: 0,
        skipped: locCount,
      };
    default:
      throw new Error(`Unknown entity type: ${entityType}`);
  }
}
