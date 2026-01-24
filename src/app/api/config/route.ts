/**
 * CBAHI Configuration API
 *
 * Returns public configuration that needs to be available at runtime
 * (since NEXT_PUBLIC_ vars are only embedded at build time)
 */

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    testingMode: process.env.TESTING_MODE === "true",
  });
}
