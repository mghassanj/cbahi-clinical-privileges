"use client";

/**
 * CBAHI Real-time Notifications Hook
 *
 * Hook for connecting to the SSE notification stream and managing
 * notification state with automatic reconnection support.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import type { BroadcastNotification } from "@/lib/notifications/broadcast";

// ============================================================================
// Types
// ============================================================================

export interface NotificationState {
  notifications: BroadcastNotification[];
  unreadCount: number;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}

export interface UseNotificationsOptions {
  /**
   * Maximum number of notifications to keep in state
   * @default 100
   */
  maxNotifications?: number;
  /**
   * Whether to auto-connect on mount
   * @default true
   */
  autoConnect?: boolean;
  /**
   * Callback when a new notification is received
   */
  onNotification?: (notification: BroadcastNotification) => void;
  /**
   * Callback when connection status changes
   */
  onConnectionChange?: (isConnected: boolean) => void;
  /**
   * Reconnect delay in milliseconds
   * @default 3000
   */
  reconnectDelay?: number;
  /**
   * Maximum reconnect attempts before giving up
   * @default 10
   */
  maxReconnectAttempts?: number;
}

export interface UseNotificationsReturn extends NotificationState {
  /**
   * Connect to the notification stream
   */
  connect: () => void;
  /**
   * Disconnect from the notification stream
   */
  disconnect: () => void;
  /**
   * Mark a notification as read
   */
  markAsRead: (notificationId: string) => void;
  /**
   * Mark all notifications as read
   */
  markAllAsRead: () => void;
  /**
   * Clear all notifications
   */
  clearAll: () => void;
  /**
   * Remove a specific notification
   */
  removeNotification: (notificationId: string) => void;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_MAX_NOTIFICATIONS = 100;
const DEFAULT_RECONNECT_DELAY = 3000;
const DEFAULT_MAX_RECONNECT_ATTEMPTS = 10;

// ============================================================================
// Hook Implementation
// ============================================================================

export function useNotifications(
  options: UseNotificationsOptions = {}
): UseNotificationsReturn {
  const {
    maxNotifications = DEFAULT_MAX_NOTIFICATIONS,
    autoConnect = true,
    onNotification,
    onConnectionChange,
    reconnectDelay = DEFAULT_RECONNECT_DELAY,
    maxReconnectAttempts = DEFAULT_MAX_RECONNECT_ATTEMPTS,
  } = options;

  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated" && !!session?.user?.id;

  // State
  const [notifications, setNotifications] = useState<BroadcastNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for managing connection
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldReconnectRef = useRef(true);

  // Calculate unread count
  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  // Connection change callback
  useEffect(() => {
    if (onConnectionChange) {
      onConnectionChange(isConnected);
    }
  }, [isConnected, onConnectionChange]);

  // Clear reconnect timeout on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  // Connect to SSE stream
  const connect = useCallback(() => {
    // Don't connect if not authenticated
    if (!isAuthenticated) {
      console.log("[useNotifications] Not authenticated, skipping connection");
      return;
    }

    // Don't connect if already connected or connecting
    if (eventSourceRef.current || isConnecting) {
      console.log("[useNotifications] Already connected or connecting");
      return;
    }

    setIsConnecting(true);
    setError(null);
    shouldReconnectRef.current = true;

    console.log("[useNotifications] Connecting to notification stream...");

    try {
      const eventSource = new EventSource("/api/notifications/stream", {
        withCredentials: true,
      });

      eventSourceRef.current = eventSource;

      // Handle successful connection
      eventSource.addEventListener("connected", (event) => {
        console.log("[useNotifications] Connected to notification stream");
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
        reconnectAttemptsRef.current = 0;

        try {
          const data = JSON.parse(event.data);
          console.log("[useNotifications] Connection confirmed:", data);
        } catch {
          // Ignore parse errors for connection message
        }
      });

      // Handle incoming notifications
      eventSource.addEventListener("notification", (event) => {
        try {
          const notification: BroadcastNotification = JSON.parse(event.data);
          console.log("[useNotifications] Received notification:", notification);

          setNotifications((prev) => {
            // Check for duplicates
            if (prev.some((n) => n.id === notification.id)) {
              return prev;
            }

            // Add new notification at the beginning
            const updated = [notification, ...prev];

            // Trim to max size
            if (updated.length > maxNotifications) {
              return updated.slice(0, maxNotifications);
            }

            return updated;
          });

          // Call the callback
          if (onNotification) {
            onNotification(notification);
          }
        } catch (err) {
          console.error("[useNotifications] Error parsing notification:", err);
        }
      });

      // Handle reconnect instruction from server
      eventSource.addEventListener("reconnect", () => {
        console.log(
          "[useNotifications] Server requested reconnect, will reconnect..."
        );
        eventSource.close();
        eventSourceRef.current = null;
        setIsConnected(false);

        // Immediate reconnect for server-initiated reconnects
        if (shouldReconnectRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 1000);
        }
      });

      // Handle connection open
      eventSource.onopen = () => {
        console.log("[useNotifications] EventSource connection opened");
      };

      // Handle errors
      eventSource.onerror = (err) => {
        console.error("[useNotifications] EventSource error:", err);

        // Check if connection was closed
        if (eventSource.readyState === EventSource.CLOSED) {
          eventSourceRef.current = null;
          setIsConnected(false);
          setIsConnecting(false);

          // Attempt reconnection
          if (shouldReconnectRef.current && isAuthenticated) {
            reconnectAttemptsRef.current += 1;

            if (reconnectAttemptsRef.current <= maxReconnectAttempts) {
              const delay = reconnectDelay * Math.min(reconnectAttemptsRef.current, 5);
              console.log(
                `[useNotifications] Will reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`
              );

              setError(
                `Connection lost. Reconnecting... (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`
              );

              reconnectTimeoutRef.current = setTimeout(() => {
                connect();
              }, delay);
            } else {
              setError(
                "Unable to connect to notification server. Please refresh the page."
              );
              console.error(
                "[useNotifications] Max reconnect attempts reached"
              );
            }
          }
        } else if (eventSource.readyState === EventSource.CONNECTING) {
          console.log("[useNotifications] EventSource reconnecting...");
        }
      };
    } catch (err) {
      console.error("[useNotifications] Failed to create EventSource:", err);
      setIsConnecting(false);
      setError("Failed to connect to notification server");
    }
  }, [
    isAuthenticated,
    isConnecting,
    maxNotifications,
    maxReconnectAttempts,
    onNotification,
    reconnectDelay,
  ]);

  // Disconnect from SSE stream
  const disconnect = useCallback(() => {
    console.log("[useNotifications] Disconnecting from notification stream");

    shouldReconnectRef.current = false;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setIsConnected(false);
    setIsConnecting(false);
    setError(null);
    reconnectAttemptsRef.current = 0;
  }, []);

  // Auto-connect when authenticated
  useEffect(() => {
    if (autoConnect && isAuthenticated && !isConnected && !isConnecting) {
      connect();
    }

    // Disconnect when session changes (logout)
    if (!isAuthenticated && eventSourceRef.current) {
      disconnect();
    }
  }, [autoConnect, isAuthenticated, isConnected, isConnecting, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // Mark notification as read
  const markAsRead = useCallback((notificationId: string) => {
    setReadIds((prev) => new Set(Array.from(prev).concat(notificationId)));
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    setReadIds((prev) => {
      const newSet = new Set(Array.from(prev));
      notifications.forEach((n) => newSet.add(n.id));
      return newSet;
    });
  }, [notifications]);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
    setReadIds(new Set());
  }, []);

  // Remove a specific notification
  const removeNotification = useCallback((notificationId: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
  }, []);

  return {
    notifications,
    unreadCount,
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    markAsRead,
    markAllAsRead,
    clearAll,
    removeNotification,
  };
}

export default useNotifications;
