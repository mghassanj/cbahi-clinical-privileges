/**
 * CBAHI Clinical Privileges - Jisr Sync API
 *
 * POST - Trigger manual sync (admin only or via cron secret)
 * GET  - Get sync status and last sync time
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { UserRole } from "@prisma/client";
import { JisrClient, JisrClientError } from "@/lib/jisr";

// Cron secret for automated sync
const CRON_SECRET = process.env.CRON_SECRET;

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
    // Check for cron secret authentication first
    const cronSecret = request.headers.get("x-cron-secret");
    const isCronAuth = CRON_SECRET && cronSecret === CRON_SECRET;

    let userId: string | null = null;
    let userEmail: string | null = null;
    let userName: string | null = null;

    if (isCronAuth) {
      // Cron authentication - use system user context
      userId = "system";
      userEmail = "system@cbahi.local";
      userName = "System (Cron)";
    } else {
      // Session authentication
      const session = await getServerSession();

      if (!session?.user?.id) {
        return NextResponse.json(
          { error: "Unauthorized", message: "Please sign in to continue" },
          { status: 401 }
        );
      }

      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, role: true, nameEn: true, email: true },
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

      userId = user.id;
      userEmail = session.user.email || "";
      userName = user.nameEn;
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

    // Use database settings or fall back to environment variables
    const jisrAccessToken = settings?.jisrAccessToken || process.env.JISR_ACCESS_TOKEN;
    const jisrSlug = settings?.jisrSlug || process.env.JISR_COMPANY_SLUG;

    if (!jisrAccessToken || !jisrSlug) {
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
        // Sync from Jisr HR API
        const result = await syncFromJisr(entityType, jisrSlug, jisrAccessToken);

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

    // Log audit (skip if cron auth with no real user)
    if (userId && userId !== "system") {
      await prisma.auditLog.create({
        data: {
          userId: userId,
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
    }

    // Create notification for sync completion (skip if cron auth)
    const hasErrors = results.some((r) => r.status === "error");
    if (userEmail && userEmail !== "system@cbahi.local") {
      await prisma.notificationLog.create({
        data: {
          type: hasErrors ? "SYNC_FAILED" : "SYNC_COMPLETED",
          recipientEmail: userEmail,
          recipientName: userName || "Administrator",
          subject: hasErrors
            ? "Jisr Sync Completed with Errors"
            : "Jisr Sync Completed Successfully",
          status: "PENDING",
          metadata: { results: JSON.parse(JSON.stringify(results)) },
        },
      });
    }

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
 * Sync data from Jisr HR API
 */
async function syncFromJisr(
  entityType: string,
  jisrSlug: string,
  jisrAccessToken: string
): Promise<{
  total: number;
  added: number;
  updated: number;
  skipped: number;
}> {
  const client = new JisrClient({
    accessToken: jisrAccessToken,
    companySlug: jisrSlug,
    locale: "en",
  });

  switch (entityType) {
    case "users":
      return await syncUsers(client);
    case "departments":
      return await syncDepartments(client);
    case "locations":
      return await syncLocations(client);
    default:
      throw new Error(`Unknown entity type: ${entityType}`);
  }
}

/**
 * Sync users from Jisr
 */
async function syncUsers(client: JisrClient): Promise<{
  total: number;
  added: number;
  updated: number;
  skipped: number;
}> {
  const employees = await client.getEmployees();
  let added = 0;
  let updated = 0;
  let skipped = 0;

  for (const emp of employees) {
    try {
      const email = emp.email || emp.work_email;
      if (!email) {
        skipped++;
        continue;
      }

      // Check if user exists
      const existing = await prisma.user.findFirst({
        where: {
          OR: [
            { email: email },
            { jisrId: String(emp.id) },
          ],
        },
      });

      // Find or create department
      let departmentId: string | null = null;
      if (emp.department_id) {
        const dept = await prisma.department.findFirst({
          where: { jisrId: String(emp.department_id) },
        });
        departmentId = dept?.id || null;
      }

      // Find or create location
      let locationId: string | null = null;
      if (emp.location_id) {
        const loc = await prisma.location.findFirst({
          where: { jisrId: String(emp.location_id) },
        });
        locationId = loc?.id || null;
      }

      const userData = {
        email: email,
        nameEn: emp.full_name || `${emp.first_name || ""} ${emp.last_name || ""}`.trim(),
        nameAr: emp.full_name_ar || `${emp.first_name_ar || ""} ${emp.last_name_ar || ""}`.trim() || null,
        jisrId: String(emp.id),
        jisrEmployeeNumber: emp.employee_number || null,
        departmentId: departmentId,
        locationId: locationId,
        jobTitleEn: emp.job_title_name || null,
        isActive: emp.is_active !== false,
        role: UserRole.PRACTITIONER, // Default role
      };

      if (existing) {
        // Update existing user
        await prisma.user.update({
          where: { id: existing.id },
          data: userData,
        });
        updated++;
      } else {
        // Create new user
        await prisma.user.create({
          data: userData,
        });
        added++;
      }
    } catch (error) {
      console.error(`Error syncing user ${emp.id}:`, error);
      skipped++;
    }
  }

  return {
    total: employees.length,
    added,
    updated,
    skipped,
  };
}

/**
 * Sync departments from Jisr
 */
async function syncDepartments(client: JisrClient): Promise<{
  total: number;
  added: number;
  updated: number;
  skipped: number;
}> {
  const departments = await client.getDepartments();
  let added = 0;
  let updated = 0;
  let skipped = 0;

  for (const dept of departments) {
    try {
      const existing = await prisma.department.findFirst({
        where: { jisrId: String(dept.id) },
      });

      const deptData = {
        nameEn: dept.name || `Department ${dept.id}`,
        nameAr: dept.name_ar || null,
        jisrId: String(dept.id),
        isActive: dept.is_active !== false,
      };

      if (existing) {
        await prisma.department.update({
          where: { id: existing.id },
          data: deptData,
        });
        updated++;
      } else {
        await prisma.department.create({
          data: deptData,
        });
        added++;
      }
    } catch (error) {
      console.error(`Error syncing department ${dept.id}:`, error);
      skipped++;
    }
  }

  return {
    total: departments.length,
    added,
    updated,
    skipped,
  };
}

/**
 * Sync locations from Jisr
 */
async function syncLocations(client: JisrClient): Promise<{
  total: number;
  added: number;
  updated: number;
  skipped: number;
}> {
  const locations = await client.getLocations();
  let added = 0;
  let updated = 0;
  let skipped = 0;

  for (const loc of locations) {
    try {
      const existing = await prisma.location.findFirst({
        where: { jisrId: String(loc.id) },
      });

      const locData = {
        nameEn: loc.name || `Location ${loc.id}`,
        nameAr: loc.name_ar || null,
        jisrId: String(loc.id),
        isActive: loc.is_active !== false,
      };

      if (existing) {
        await prisma.location.update({
          where: { id: existing.id },
          data: locData,
        });
        updated++;
      } else {
        await prisma.location.create({
          data: locData,
        });
        added++;
      }
    } catch (error) {
      console.error(`Error syncing location ${loc.id}:`, error);
      skipped++;
    }
  }

  return {
    total: locations.length,
    added,
    updated,
    skipped,
  };
}
