/**
 * Config API Endpoint
 *
 * Returns public configuration values to the client.
 * Only exposes non-sensitive configuration.
 */

import { NextResponse } from "next/server";

// Force dynamic rendering so environment variables are read at runtime
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    testingMode: process.env.TESTING_MODE === "true",
  });
}
