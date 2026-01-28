/**
 * CBAHI Real-time Notifications - SSE Stream Endpoint
 *
 * Server-Sent Events endpoint for real-time notification delivery.
 * Clients connect here to receive push notifications.
 */

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  registerClient,
  unregisterClient,
  sendHeartbeat,
  type SSEClient,
} from "@/lib/notifications/broadcast";

// ============================================================================
// Configuration
// ============================================================================

// Heartbeat interval in milliseconds (30 seconds)
const HEARTBEAT_INTERVAL = 30000;

// Maximum connection time (2 hours) - clients should reconnect
const MAX_CONNECTION_TIME = 2 * 60 * 60 * 1000;

// ============================================================================
// GET - SSE Stream Connection
// ============================================================================

export async function GET(request: NextRequest) {
  // Authenticate the user
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new Response(
      JSON.stringify({ error: "Unauthorized", message: "Please sign in to receive notifications" }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const userId = session.user.id;

  // Check for EventSource support via Accept header
  const acceptHeader = request.headers.get("Accept");
  if (!acceptHeader?.includes("text/event-stream")) {
    return new Response(
      JSON.stringify({
        error: "Invalid request",
        message: "This endpoint requires SSE (text/event-stream) connection",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Create a new readable stream for SSE
  let client: SSEClient | null = null;
  let heartbeatInterval: NodeJS.Timeout | null = null;
  let connectionTimeout: NodeJS.Timeout | null = null;
  let isCleanedUp = false;

  const cleanup = () => {
    if (isCleanedUp) return;
    isCleanedUp = true;

    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
    if (connectionTimeout) {
      clearTimeout(connectionTimeout);
      connectionTimeout = null;
    }
    if (client) {
      unregisterClient(client);
      client = null;
    }
  };

  const stream = new ReadableStream({
    start(controller) {
      // Register this client
      client = registerClient(userId, controller);

      // Send initial connection confirmation
      const welcomeMessage = JSON.stringify({
        type: "connected",
        message: "Successfully connected to notification stream",
        userId,
        timestamp: new Date().toISOString(),
      });
      controller.enqueue(
        new TextEncoder().encode(`event: connected\ndata: ${welcomeMessage}\n\n`)
      );

      // Set up heartbeat to keep connection alive
      heartbeatInterval = setInterval(() => {
        if (client && !isCleanedUp) {
          const success = sendHeartbeat(client);
          if (!success) {
            cleanup();
          }
        }
      }, HEARTBEAT_INTERVAL);

      // Set maximum connection time
      connectionTimeout = setTimeout(() => {
        if (!isCleanedUp) {
          // Send reconnect instruction before closing
          try {
            const reconnectMessage = JSON.stringify({
              type: "reconnect",
              message: "Connection timeout, please reconnect",
              timestamp: new Date().toISOString(),
            });
            controller.enqueue(
              new TextEncoder().encode(`event: reconnect\ndata: ${reconnectMessage}\n\n`)
            );
          } catch {
            // Ignore errors when sending reconnect message
          }
          cleanup();
          controller.close();
        }
      }, MAX_CONNECTION_TIME);

      console.log(`[SSE] User ${userId} connected to notification stream`);
    },

    cancel() {
      console.log(`[SSE] User ${userId} disconnected from notification stream`);
      cleanup();
    },
  });

  // Listen for client disconnect via AbortSignal
  request.signal.addEventListener("abort", () => {
    console.log(`[SSE] User ${userId} connection aborted`);
    cleanup();
  });

  // Return the SSE response
  const origin = process.env.NEXT_PUBLIC_APP_URL || request.headers.get("origin") || "https://cbahi-web-production.up.railway.app";
  
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Credentials": "true",
    },
  });
}

// ============================================================================
// OPTIONS - CORS Support
// ============================================================================

export async function OPTIONS(request: NextRequest) {
  const origin = process.env.NEXT_PUBLIC_APP_URL || request.headers.get("origin") || "https://cbahi-web-production.up.railway.app";
  
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Max-Age": "86400",
    },
  });
}
