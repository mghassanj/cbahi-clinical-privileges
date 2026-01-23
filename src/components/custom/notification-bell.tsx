"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import {
  Bell,
  Check,
  CheckCheck,
  X,
  AlertTriangle,
  Info,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";

export interface Notification {
  /**
   * Unique identifier
   */
  id: string;
  /**
   * Notification title in English
   */
  titleEn: string;
  /**
   * Notification title in Arabic
   */
  titleAr: string;
  /**
   * Notification message in English
   */
  messageEn: string;
  /**
   * Notification message in Arabic
   */
  messageAr: string;
  /**
   * Notification type
   */
  type: "info" | "success" | "warning" | "error";
  /**
   * Whether the notification has been read
   */
  read: boolean;
  /**
   * When the notification was created
   */
  createdAt: Date | string;
  /**
   * Optional link to navigate to
   */
  link?: string;
  /**
   * Associated request ID (if applicable)
   */
  requestId?: string;
}

export interface NotificationBellProps {
  /**
   * List of notifications
   */
  notifications: Notification[];
  /**
   * Callback when a notification is marked as read
   */
  onMarkRead: (notificationId: string) => void;
  /**
   * Callback when all notifications are marked as read
   */
  onMarkAllRead?: () => void;
  /**
   * Callback when a notification is clicked
   */
  onClick?: (notification: Notification) => void;
  /**
   * Current locale
   * @default "en"
   */
  locale?: "en" | "ar";
  /**
   * Maximum notifications to show in dropdown
   * @default 5
   */
  maxVisible?: number;
  /**
   * Additional class name
   */
  className?: string;
}

const TYPE_CONFIGS: Record<
  Notification["type"],
  { icon: React.ReactNode; color: string; bgColor: string }
> = {
  info: {
    icon: <Info size={16} />,
    color: "text-primary-600 dark:text-primary-400",
    bgColor: "bg-primary-100 dark:bg-primary-900/30",
  },
  success: {
    icon: <CheckCircle2 size={16} />,
    color: "text-success-600 dark:text-success-400",
    bgColor: "bg-success-100 dark:bg-success-900/30",
  },
  warning: {
    icon: <AlertTriangle size={16} />,
    color: "text-warning-600 dark:text-warning-400",
    bgColor: "bg-warning-100 dark:bg-warning-900/30",
  },
  error: {
    icon: <XCircle size={16} />,
    color: "text-error-600 dark:text-error-400",
    bgColor: "bg-error-100 dark:bg-error-900/30",
  },
};

const LABELS = {
  en: {
    notifications: "Notifications",
    noNotifications: "No notifications",
    markAllRead: "Mark all as read",
    viewAll: "View all notifications",
    justNow: "Just now",
  },
  ar: {
    notifications: "الإشعارات",
    noNotifications: "لا توجد إشعارات",
    markAllRead: "تحديد الكل كمقروء",
    viewAll: "عرض جميع الإشعارات",
    justNow: "الآن",
  },
};

/**
 * Notification bell icon with unread count badge and dropdown.
 * Shows recent notifications with mark as read functionality.
 */
const NotificationBell: React.FC<NotificationBellProps> = ({
  notifications,
  onMarkRead,
  onMarkAllRead,
  onClick,
  locale = "en",
  maxVisible = 5,
  className,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const isArabic = locale === "ar";
  const labels = LABELS[locale];
  const dateLocale = isArabic ? ar : enUS;

  const unreadCount = notifications.filter((n) => !n.read).length;
  const visibleNotifications = notifications.slice(0, maxVisible);
  const hasMore = notifications.length > maxVisible;

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatTimestamp = (date: Date | string) => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    const now = new Date();
    const diffMinutes = Math.floor(
      (now.getTime() - dateObj.getTime()) / (1000 * 60)
    );

    if (diffMinutes < 1) {
      return labels.justNow;
    }

    if (diffMinutes < 60 * 24) {
      return formatDistanceToNow(dateObj, { addSuffix: true, locale: dateLocale });
    }

    return format(dateObj, "MMM d, h:mm a", { locale: dateLocale });
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      onMarkRead(notification.id);
    }
    if (onClick) {
      onClick(notification);
    }
    setIsOpen(false);
  };

  const handleMarkAllRead = () => {
    if (onMarkAllRead) {
      onMarkAllRead();
    }
  };

  const renderNotification = (notification: Notification) => {
    const config = TYPE_CONFIGS[notification.type];

    return (
      <div
        key={notification.id}
        onClick={() => handleNotificationClick(notification)}
        className={cn(
          "flex items-start gap-3 p-3 cursor-pointer",
          "transition-colors duration-150",
          "hover:bg-neutral-50 dark:hover:bg-neutral-800/50",
          !notification.read && "bg-primary-50/50 dark:bg-primary-900/10"
        )}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            handleNotificationClick(notification);
          }
        }}
      >
        {/* Type icon */}
        <div
          className={cn(
            "flex-shrink-0 p-2 rounded-full",
            config.bgColor,
            config.color
          )}
        >
          {config.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "text-sm font-medium text-neutral-900 dark:text-neutral-100",
              !notification.read && "font-semibold",
              isArabic && "font-arabic"
            )}
          >
            {isArabic ? notification.titleAr : notification.titleEn}
          </p>
          <p
            className={cn(
              "text-xs text-neutral-600 dark:text-neutral-400 mt-0.5 line-clamp-2",
              isArabic && "font-arabic"
            )}
          >
            {isArabic ? notification.messageAr : notification.messageEn}
          </p>
          <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1 flex items-center gap-1">
            <Clock size={10} />
            {formatTimestamp(notification.createdAt)}
          </p>
        </div>

        {/* Unread indicator */}
        {!notification.read && (
          <div className="flex-shrink-0">
            <div className="w-2 h-2 rounded-full bg-primary-500" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      ref={dropdownRef}
      className={cn("relative", className)}
      dir={isArabic ? "rtl" : "ltr"}
    >
      {/* Bell button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative p-2 rounded-lg",
          "text-neutral-600 hover:text-neutral-900",
          "dark:text-neutral-400 dark:hover:text-neutral-100",
          "hover:bg-neutral-100 dark:hover:bg-neutral-800",
          "transition-colors duration-200",
          "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2",
          "dark:focus:ring-offset-neutral-900"
        )}
        aria-label={labels.notifications}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Bell size={22} />

        {/* Unread count badge */}
        {unreadCount > 0 && (
          <span
            className={cn(
              "absolute -top-1 -right-1 rtl:-left-1 rtl:right-auto",
              "min-w-[18px] h-[18px] px-1",
              "flex items-center justify-center",
              "text-[10px] font-bold text-white",
              "bg-error-500 rounded-full",
              "animate-pulse"
            )}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className={cn(
            "absolute top-full mt-2 w-80 sm:w-96",
            "bg-white dark:bg-neutral-900",
            "border border-neutral-200 dark:border-neutral-700",
            "rounded-xl shadow-lg",
            "overflow-hidden z-50",
            "animate-slide-down",
            "ltr:right-0 rtl:left-0"
          )}
        >
          {/* Header */}
          <div
            className={cn(
              "flex items-center justify-between px-4 py-3",
              "border-b border-neutral-200 dark:border-neutral-700"
            )}
          >
            <h3 className={cn("font-semibold text-neutral-900 dark:text-neutral-100", isArabic && "font-arabic")}>
              {labels.notifications}
            </h3>

            {unreadCount > 0 && onMarkAllRead && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className={cn(
                  "text-xs text-primary-600 dark:text-primary-400",
                  "hover:underline flex items-center gap-1"
                )}
              >
                <CheckCheck size={14} />
                {labels.markAllRead}
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell size={40} className="mx-auto text-neutral-300 dark:text-neutral-600 mb-3" />
                <p className={cn("text-sm text-neutral-500 dark:text-neutral-400", isArabic && "font-arabic")}>
                  {labels.noNotifications}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {visibleNotifications.map(renderNotification)}
              </div>
            )}
          </div>

          {/* Footer */}
          {hasMore && (
            <div className="border-t border-neutral-200 dark:border-neutral-700">
              <button
                type="button"
                className={cn(
                  "w-full py-3 text-sm text-center",
                  "text-primary-600 dark:text-primary-400",
                  "hover:bg-neutral-50 dark:hover:bg-neutral-800/50",
                  "transition-colors duration-150"
                )}
              >
                {labels.viewAll}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

NotificationBell.displayName = "NotificationBell";

export { NotificationBell };
