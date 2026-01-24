/**
 * CBAHI Clinical Privileges - Health Check API
 *
 * Simple health check endpoint for Railway deployment monitoring.
 * Always returns 200 to pass healthchecks.
 */

import { NextResponse } from "next/server";

// Force dynamic rendering - never static
export const dynamic = "force-dynamic";

/**
 * GET /api/health
 *
 * Health check endpoint for monitoring and load balancer health checks.
 * Always returns 200.
 */
export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}

/**
 * HEAD /api/health
 *
 * Lightweight health check for load balancers.
 */
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
