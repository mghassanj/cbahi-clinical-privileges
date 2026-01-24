"use client";

/**
 * CBAHI Real-time Notification Provider
 *
 * Provides notification context to the application and handles
 * displaying toast notifications for real-time events.
 */

import React, {
  createContext,
  useContext,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import { toast } from "sonner";
import { useNotifications, type UseNotificationsReturn } from "@/hooks/useNotifications";
import type { BroadcastNotification } from "@/lib/notifications/broadcast";

// ============================================================================
// Types
// ============================================================================

export interface NotificationContextValue extends UseNotificationsReturn {
  /**
   * Current locale for displaying notifications
   */
  locale: "en" | "ar";
  /**
   * Show a toast notification manually
   */
  showToast: (notification: Partial<BroadcastNotification>) => void;
}

export interface NotificationProviderProps {
  children: ReactNode;
  /**
   * Current locale
   * @default "en"
   */
  locale?: "en" | "ar";
  /**
   * Whether to show toast notifications for real-time events
   * @default true
   */
  showToasts?: boolean;
  /**
   * Toast duration in milliseconds
   * @default 5000
   */
  toastDuration?: number;
}

// ============================================================================
// Context
// ============================================================================

const NotificationContext = createContext<NotificationContextValue | null>(null);

// ============================================================================
// Hook to use notification context
// ============================================================================

export function useNotificationContext(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotificationContext must be used within a NotificationProvider"
    );
  }
  return context;
}

// ============================================================================
// Toast Helper Functions
// ============================================================================

function getToastType(
  severity: BroadcastNotification["severity"]
): "success" | "error" | "warning" | "info" | "message" {
  switch (severity) {
    case "success":
      return "success";
    case "error":
      return "error";
    case "warning":
      return "warning";
    case "info":
    default:
      return "info";
  }
}

function showNotificationToast(
  notification: BroadcastNotification,
  locale: "en" | "ar",
  duration: number
): void {
  const title = locale === "ar" ? notification.titleAr : notification.titleEn;
  const message = locale === "ar" ? notification.messageAr : notification.messageEn;
  const toastType = getToastType(notification.severity);

  const toastOptions = {
    id: notification.id,
    duration,
    description: message,
    action: notification.actionUrl
      ? {
          label: locale === "ar" ? "عرض" : "View",
          onClick: () => {
            window.location.href = notification.actionUrl!;
          },
        }
      : undefined,
  };

  switch (toastType) {
    case "success":
      toast.success(title, toastOptions);
      break;
    case "error":
      toast.error(title, toastOptions);
      break;
    case "warning":
      toast.warning(title, toastOptions);
      break;
    case "info":
      toast.info(title, toastOptions);
      break;
    default:
      toast.message(title, toastOptions);
  }
}

// ============================================================================
// Provider Component
// ============================================================================

export function NotificationProvider({
  children,
  locale = "en",
  showToasts = true,
  toastDuration = 5000,
}: NotificationProviderProps): JSX.Element {
  // Handle incoming notifications
  const handleNotification = useCallback(
    (notification: BroadcastNotification) => {
      if (showToasts) {
        showNotificationToast(notification, locale, toastDuration);
      }
    },
    [showToasts, locale, toastDuration]
  );

  // Handle connection status changes
  const handleConnectionChange = useCallback(
    (isConnected: boolean) => {
      // Only show connection status in development
      if (process.env.NODE_ENV === "development") {
        if (isConnected) {
          console.log("[NotificationProvider] Connected to real-time notifications");
        } else {
          console.log("[NotificationProvider] Disconnected from real-time notifications");
        }
      }
    },
    []
  );

  // Use the notifications hook
  const notificationsState = useNotifications({
    autoConnect: true,
    onNotification: handleNotification,
    onConnectionChange: handleConnectionChange,
    maxNotifications: 100,
    reconnectDelay: 3000,
    maxReconnectAttempts: 10,
  });

  // Manual toast function
  const showToast = useCallback(
    (notification: Partial<BroadcastNotification>) => {
      const fullNotification: BroadcastNotification = {
        id: notification.id || `toast-${Date.now()}`,
        type: notification.type || "STATUS_CHANGED",
        titleEn: notification.titleEn || "Notification",
        titleAr: notification.titleAr || "إشعار",
        messageEn: notification.messageEn || "",
        messageAr: notification.messageAr || "",
        severity: notification.severity || "info",
        timestamp: notification.timestamp || new Date(),
        requestId: notification.requestId,
        requestNumber: notification.requestNumber,
        actionUrl: notification.actionUrl,
        metadata: notification.metadata,
      };

      showNotificationToast(fullNotification, locale, toastDuration);
    },
    [locale, toastDuration]
  );

  // Memoize context value
  const contextValue = useMemo<NotificationContextValue>(
    () => ({
      ...notificationsState,
      locale,
      showToast,
    }),
    [notificationsState, locale, showToast]
  );

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
}

// ============================================================================
// Exports
// ============================================================================

export { NotificationContext };
export default NotificationProvider;
