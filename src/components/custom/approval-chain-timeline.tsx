"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import {
  Check,
  Clock,
  Circle,
  XCircle,
  SkipForward,
  MessageSquare,
  User,
} from "lucide-react";
import { ApprovalStep, Approver } from "@/lib/notifications/types";

export interface Approval {
  /**
   * Unique identifier
   */
  id: string;
  /**
   * Approval level/order
   */
  level: number;
  /**
   * Approver information
   */
  approver: {
    id: string;
    nameEn: string;
    nameAr: string;
    role: string;
    roleAr: string;
    email?: string;
    avatar?: string;
  };
  /**
   * Status of this approval step
   */
  status: "PENDING" | "APPROVED" | "REJECTED" | "SKIPPED";
  /**
   * When the action was taken
   */
  actionDate?: Date | string;
  /**
   * Comments from approver
   */
  comments?: string;
  /**
   * Arabic comments
   */
  commentsAr?: string;
}

export interface ApprovalChainTimelineProps {
  /**
   * List of approval steps
   */
  approvals: Approval[];
  /**
   * Current approval level (0-based)
   */
  currentLevel: number;
  /**
   * Current locale
   * @default "en"
   */
  locale?: "en" | "ar";
  /**
   * Whether to show detailed view with comments
   * @default true
   */
  showDetails?: boolean;
  /**
   * Whether to show connector lines
   * @default true
   */
  showConnectors?: boolean;
  /**
   * Additional class name
   */
  className?: string;
}

interface StatusConfig {
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  lineColor: string;
  labelEn: string;
  labelAr: string;
}

const STATUS_CONFIGS: Record<Approval["status"], StatusConfig> = {
  APPROVED: {
    icon: <Check size={16} />,
    color: "text-success-600 dark:text-success-400",
    bgColor: "bg-success-100 dark:bg-success-900/30",
    borderColor: "border-success-400 dark:border-success-600",
    lineColor: "bg-success-400 dark:bg-success-600",
    labelEn: "Approved",
    labelAr: "تمت الموافقة",
  },
  REJECTED: {
    icon: <XCircle size={16} />,
    color: "text-error-600 dark:text-error-400",
    bgColor: "bg-error-100 dark:bg-error-900/30",
    borderColor: "border-error-400 dark:border-error-600",
    lineColor: "bg-error-400 dark:bg-error-600",
    labelEn: "Rejected",
    labelAr: "مرفوض",
  },
  PENDING: {
    icon: <Clock size={16} />,
    color: "text-warning-600 dark:text-warning-400",
    bgColor: "bg-warning-100 dark:bg-warning-900/30",
    borderColor: "border-warning-400 dark:border-warning-600",
    lineColor: "bg-warning-400 dark:bg-warning-600",
    labelEn: "Pending",
    labelAr: "قيد الانتظار",
  },
  SKIPPED: {
    icon: <SkipForward size={16} />,
    color: "text-neutral-500 dark:text-neutral-400",
    bgColor: "bg-neutral-100 dark:bg-neutral-800",
    borderColor: "border-neutral-300 dark:border-neutral-600",
    lineColor: "bg-neutral-300 dark:bg-neutral-600",
    labelEn: "Skipped",
    labelAr: "تم تخطيه",
  },
};

/**
 * Vertical timeline component showing approval progress.
 * Displays each approver with their status, role, and timestamp.
 */
const ApprovalChainTimeline: React.FC<ApprovalChainTimelineProps> = ({
  approvals,
  currentLevel,
  locale = "en",
  showDetails = true,
  showConnectors = true,
  className,
}) => {
  const isArabic = locale === "ar";
  const dateLocale = isArabic ? ar : enUS;

  const formatTimestamp = (date: Date | string | undefined) => {
    if (!date) return null;
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return format(dateObj, "PPp", { locale: dateLocale });
  };

  const getApprovalStatus = (approval: Approval, index: number): Approval["status"] => {
    // If the approval already has a final status, use it
    if (approval.status === "APPROVED" || approval.status === "REJECTED" || approval.status === "SKIPPED") {
      return approval.status;
    }

    // If it's the current level and still pending
    if (index === currentLevel) {
      return "PENDING";
    }

    // Future approvals show as pending but with waiting state
    return approval.status;
  };

  const renderApprovalIcon = (approval: Approval, index: number) => {
    const status = getApprovalStatus(approval, index);
    const config = STATUS_CONFIGS[status];
    const isCurrent = index === currentLevel && status === "PENDING";

    return (
      <div
        className={cn(
          "relative flex items-center justify-center",
          "w-10 h-10 rounded-full border-2",
          "transition-all duration-300",
          config.bgColor,
          config.borderColor,
          config.color,
          isCurrent && "ring-4 ring-warning-200 dark:ring-warning-900/50 animate-pulse"
        )}
      >
        {status === "PENDING" && index > currentLevel ? (
          <Circle size={16} />
        ) : (
          config.icon
        )}
      </div>
    );
  };

  const renderConnectorLine = (index: number, status: Approval["status"]) => {
    if (!showConnectors || index === approvals.length - 1) return null;

    const config = STATUS_CONFIGS[status];
    const isCompleted = status === "APPROVED" || status === "SKIPPED";

    return (
      <div
        className={cn(
          "absolute left-5 top-10 w-0.5 h-full -translate-x-1/2",
          "transition-colors duration-300",
          isCompleted ? config.lineColor : "bg-neutral-200 dark:bg-neutral-700",
          isArabic && "left-auto right-5 translate-x-1/2"
        )}
        style={{ height: "calc(100% - 2.5rem)" }}
      />
    );
  };

  return (
    <div
      className={cn("relative", className)}
      dir={isArabic ? "rtl" : "ltr"}
      role="list"
      aria-label={isArabic ? "سلسلة الموافقات" : "Approval Chain"}
    >
      {approvals.map((approval, index) => {
        const status = getApprovalStatus(approval, index);
        const config = STATUS_CONFIGS[status];
        const isCurrent = index === currentLevel && status === "PENDING";
        const isPast = index < currentLevel || status === "APPROVED" || status === "REJECTED";

        return (
          <div
            key={approval.id}
            className={cn(
              "relative flex gap-4 pb-8 last:pb-0",
              isArabic && "flex-row-reverse"
            )}
            role="listitem"
          >
            {/* Icon and connector */}
            <div className="relative flex-shrink-0">
              {renderApprovalIcon(approval, index)}
              {renderConnectorLine(index, status)}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pt-1">
              {/* Header row */}
              <div className="flex items-center gap-2 flex-wrap">
                <h4
                  className={cn(
                    "font-medium truncate",
                    isPast || isCurrent
                      ? "text-neutral-900 dark:text-neutral-100"
                      : "text-neutral-500 dark:text-neutral-400",
                    isArabic && "font-arabic"
                  )}
                >
                  {isArabic ? approval.approver.nameAr : approval.approver.nameEn}
                </h4>

                {/* Status badge */}
                <span
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5",
                    "text-xs font-medium rounded-full",
                    config.bgColor,
                    config.color
                  )}
                >
                  {isArabic ? config.labelAr : config.labelEn}
                </span>
              </div>

              {/* Role */}
              <div className="flex items-center gap-1 mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                <User size={14} />
                <span className={isArabic ? "font-arabic" : ""}>
                  {isArabic ? approval.approver.roleAr : approval.approver.role}
                </span>
              </div>

              {/* Timestamp */}
              {approval.actionDate && (
                <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
                  {formatTimestamp(approval.actionDate)}
                </p>
              )}

              {/* Comments */}
              {showDetails && (approval.comments || approval.commentsAr) && (
                <div
                  className={cn(
                    "mt-3 p-3 rounded-lg",
                    "bg-neutral-50 dark:bg-neutral-800/50",
                    "border border-neutral-200 dark:border-neutral-700"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <MessageSquare
                      size={14}
                      className="flex-shrink-0 mt-0.5 text-neutral-400"
                    />
                    <p
                      className={cn(
                        "text-sm text-neutral-600 dark:text-neutral-300",
                        isArabic && "font-arabic text-right"
                      )}
                    >
                      {isArabic
                        ? approval.commentsAr || approval.comments
                        : approval.comments}
                    </p>
                  </div>
                </div>
              )}

              {/* Current step indicator */}
              {isCurrent && (
                <p className="mt-2 text-xs text-warning-600 dark:text-warning-400 font-medium">
                  {isArabic ? "في انتظار الموافقة" : "Awaiting approval"}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

ApprovalChainTimeline.displayName = "ApprovalChainTimeline";

export { ApprovalChainTimeline };
