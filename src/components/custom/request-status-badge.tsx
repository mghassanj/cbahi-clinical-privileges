"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  FileEdit,
  Clock,
  Eye,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Ban,
} from "lucide-react";
import { RequestStatus } from "@/lib/notifications/types";

export interface RequestStatusBadgeProps {
  /**
   * The status to display
   */
  status: RequestStatus | string;
  /**
   * Size of the badge
   * @default "default"
   */
  size?: "sm" | "default" | "lg";
  /**
   * Whether to show the status icon
   * @default true
   */
  showIcon?: boolean;
  /**
   * Current locale for display
   * @default "en"
   */
  locale?: "en" | "ar";
  /**
   * Additional class name
   */
  className?: string;
}

interface StatusConfig {
  color: string;
  bgColor: string;
  borderColor: string;
  darkColor: string;
  darkBgColor: string;
  darkBorderColor: string;
  icon: React.ReactNode;
  labelEn: string;
  labelAr: string;
}

const STATUS_CONFIGS: Record<string, StatusConfig> = {
  [RequestStatus.DRAFT]: {
    color: "text-neutral-700",
    bgColor: "bg-neutral-100",
    borderColor: "border-neutral-300",
    darkColor: "dark:text-neutral-300",
    darkBgColor: "dark:bg-neutral-800",
    darkBorderColor: "dark:border-neutral-600",
    icon: <FileEdit size={14} />,
    labelEn: "Draft",
    labelAr: "مسودة",
  },
  [RequestStatus.PENDING]: {
    color: "text-warning-700",
    bgColor: "bg-warning-50",
    borderColor: "border-warning-300",
    darkColor: "dark:text-warning-300",
    darkBgColor: "dark:bg-warning-900/30",
    darkBorderColor: "dark:border-warning-700",
    icon: <Clock size={14} />,
    labelEn: "Pending",
    labelAr: "قيد الانتظار",
  },
  [RequestStatus.IN_REVIEW]: {
    color: "text-primary-700",
    bgColor: "bg-primary-50",
    borderColor: "border-primary-300",
    darkColor: "dark:text-primary-300",
    darkBgColor: "dark:bg-primary-900/30",
    darkBorderColor: "dark:border-primary-700",
    icon: <Eye size={14} />,
    labelEn: "In Review",
    labelAr: "قيد المراجعة",
  },
  [RequestStatus.APPROVED]: {
    color: "text-success-700",
    bgColor: "bg-success-50",
    borderColor: "border-success-300",
    darkColor: "dark:text-success-300",
    darkBgColor: "dark:bg-success-900/30",
    darkBorderColor: "dark:border-success-700",
    icon: <CheckCircle2 size={14} />,
    labelEn: "Approved",
    labelAr: "موافق عليه",
  },
  [RequestStatus.REJECTED]: {
    color: "text-error-700",
    bgColor: "bg-error-50",
    borderColor: "border-error-300",
    darkColor: "dark:text-error-300",
    darkBgColor: "dark:bg-error-900/30",
    darkBorderColor: "dark:border-error-700",
    icon: <XCircle size={14} />,
    labelEn: "Rejected",
    labelAr: "مرفوض",
  },
  [RequestStatus.MODIFICATIONS_REQUIRED]: {
    color: "text-warning-700",
    bgColor: "bg-warning-50",
    borderColor: "border-warning-300",
    darkColor: "dark:text-warning-300",
    darkBgColor: "dark:bg-warning-900/30",
    darkBorderColor: "dark:border-warning-700",
    icon: <AlertCircle size={14} />,
    labelEn: "Needs Changes",
    labelAr: "يحتاج تعديلات",
  },
  [RequestStatus.CANCELLED]: {
    color: "text-neutral-500",
    bgColor: "bg-neutral-100",
    borderColor: "border-neutral-300",
    darkColor: "dark:text-neutral-400",
    darkBgColor: "dark:bg-neutral-800",
    darkBorderColor: "dark:border-neutral-600",
    icon: <Ban size={14} />,
    labelEn: "Cancelled",
    labelAr: "ملغى",
  },
};

const SIZE_CLASSES = {
  sm: "px-2 py-0.5 text-xs gap-1",
  default: "px-2.5 py-1 text-sm gap-1.5",
  lg: "px-3 py-1.5 text-base gap-2",
};

const ICON_SIZES = {
  sm: 12,
  default: 14,
  lg: 16,
};

/**
 * Colored badge component for displaying request status.
 * Shows status icon and text with appropriate colors.
 */
const RequestStatusBadge: React.FC<RequestStatusBadgeProps> = ({
  status,
  size = "default",
  showIcon = true,
  locale = "en",
  className,
}) => {
  const config = STATUS_CONFIGS[status];
  const isArabic = locale === "ar";

  if (!config) {
    // Fallback for unknown status
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full border",
          "bg-neutral-100 text-neutral-700 border-neutral-300",
          "dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-600",
          SIZE_CLASSES[size],
          className
        )}
      >
        {status}
      </span>
    );
  }

  const IconComponent = React.cloneElement(config.icon as React.ReactElement, {
    size: ICON_SIZES[size],
  });

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border",
        "font-medium transition-colors duration-200",
        config.color,
        config.bgColor,
        config.borderColor,
        config.darkColor,
        config.darkBgColor,
        config.darkBorderColor,
        SIZE_CLASSES[size],
        isArabic && "flex-row-reverse font-arabic",
        className
      )}
      dir={isArabic ? "rtl" : "ltr"}
    >
      {showIcon && IconComponent}
      <span>{isArabic ? config.labelAr : config.labelEn}</span>
    </span>
  );
};

RequestStatusBadge.displayName = "RequestStatusBadge";

/**
 * Get status color for use in other components
 */
export function getStatusColor(status: RequestStatus | string): string {
  const config = STATUS_CONFIGS[status];
  return config?.color || "text-neutral-700";
}

/**
 * Get status label
 */
export function getStatusLabel(
  status: RequestStatus | string,
  locale: "en" | "ar" = "en"
): string {
  const config = STATUS_CONFIGS[status];
  if (!config) return status;
  return locale === "ar" ? config.labelAr : config.labelEn;
}

export { RequestStatusBadge };
