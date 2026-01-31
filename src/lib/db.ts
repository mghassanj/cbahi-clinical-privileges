import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Create Prisma client with resilient connection handling.
 * - Lazy connection: doesn't connect until first query
 * - Connection retry logic built into Prisma
 * - Graceful error handling for missing DATABASE_URL
 */
function createPrismaClient(): PrismaClient {
  // Check if DATABASE_URL is configured
  if (!process.env.DATABASE_URL) {
    console.warn("[Prisma] DATABASE_URL not configured - database operations will fail");
  }

  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
    // Prisma handles connection lazily - no immediate connection on instantiation
  });
}

// Singleton pattern for Prisma client
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Safe database query wrapper with error handling.
 * Use this for operations where DB failure shouldn't crash the app.
 */
export async function safeQuery<T>(
  queryFn: () => Promise<T>,
  fallback: T
): Promise<{ data: T; error: Error | null }> {
  try {
    const data = await queryFn();
    return { data, error: null };
  } catch (error) {
    console.error("[Prisma] Query failed:", error);
    return { data: fallback, error: error instanceof Error ? error : new Error(String(error)) };
  }
}

/**
 * Check database connectivity.
 * Returns true if database is reachable, false otherwise.
 */
export async function isDatabaseHealthy(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

export default prisma;
