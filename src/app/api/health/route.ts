/**
 * CBAHI Clinical Privileges - Health Check API
 *
 * Comprehensive health check endpoint that verifies:
 * - Application is running
 * - Database connectivity
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Force dynamic rendering - never static
export const dynamic = "force-dynamic";

interface HealthStatus {
  status: "ok" | "degraded" | "unhealthy";
  timestamp: string;
  checks: {
    app: "ok" | "error";
    database: "ok" | "error";
  };
  error?: string;
}

/**
 * GET /api/health
 *
 * Health check endpoint for monitoring and load balancer health checks.
 * Returns 200 if app is running (even if DB is down for graceful degradation).
 * Returns 503 only if app itself is unhealthy.
 */
export async function GET() {
  const health: HealthStatus = {
    status: "ok",
    timestamp: new Date().toISOString(),
    checks: {
      app: "ok",
      database: "ok",
    },
  };

  // Check database connectivity
  try {
    await prisma.$queryRaw`SELECT 1`;
    health.checks.database = "ok";
  } catch (error) {
    health.checks.database = "error";
    health.status = "degraded";
    health.error = error instanceof Error ? error.message : "Database connection failed";
  }

  // Return 200 even if degraded - app is still running
  // This allows Railway healthcheck to pass while alerting on DB issues
  const statusCode = health.status === "unhealthy" ? 503 : 200;

  return NextResponse.json(health, { status: statusCode });
}

/**
 * HEAD /api/health
 *
 * Lightweight health check for load balancers.
 * Only checks if app is responding, not DB.
 */
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
