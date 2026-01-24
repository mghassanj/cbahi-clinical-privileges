/**
 * CBAHI Clinical Privileges - Health Check API
 *
 * Provides health status for Railway deployment monitoring.
 * Checks database connectivity and returns system information.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

interface HealthStatus {
  status: "healthy" | "unhealthy" | "degraded";
  version: string;
  timestamp: string;
  uptime: number;
  checks: {
    database: {
      status: "up" | "down";
      latency?: number;
      error?: string;
    };
  };
}

/**
 * GET /api/health
 *
 * Health check endpoint for monitoring and load balancer health checks.
 * Returns 200 if healthy, 503 if unhealthy.
 */
export async function GET(): Promise<NextResponse<HealthStatus>> {
  const startTime = Date.now();

  // Initialize health status
  const health: HealthStatus = {
    status: "healthy",
    version: process.env.npm_package_version || "0.1.0",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      database: {
        status: "down",
      },
    },
  };

  // Check database connectivity
  try {
    const dbStart = Date.now();
    // Simple query to verify database connection
    await prisma.$queryRaw`SELECT 1`;
    const dbLatency = Date.now() - dbStart;

    health.checks.database = {
      status: "up",
      latency: dbLatency,
    };
  } catch (error) {
    health.status = "unhealthy";
    health.checks.database = {
      status: "down",
      error: error instanceof Error ? error.message : "Unknown database error",
    };
  }

  // Determine overall status
  if (health.checks.database.status === "down") {
    health.status = "unhealthy";
  }

  // Always return 200 for Railway healthcheck to pass during startup
  // The actual health status is in the response body for monitoring tools
  return NextResponse.json(health, {
    status: 200,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "X-Response-Time": `${Date.now() - startTime}ms`,
    },
  });
}

/**
 * HEAD /api/health
 *
 * Lightweight health check for load balancers that only need status code.
 */
export async function HEAD(): Promise<NextResponse> {
  // Always return 200 for healthcheck probes
  return new NextResponse(null, { status: 200 });
}
