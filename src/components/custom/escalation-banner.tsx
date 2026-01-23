"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { AlertTriangle, Clock, User, ArrowUp, X } from "lucide-react";
import { EscalationLevel } from "@/lib/notifications/types";

export interface EscalationBannerProps {
  /**
   * Escalation level (1=reminder, 2=manager, 3=HR)
   */
  level: EscalationLevel | number;
  /**
   * Number of hours the request has been pending
   */
  hoursPending: number;
  /**
   * Name of the current approver
   */
  approverNameEn: string;
  /**
   * Arabic name of the current approver
   */
  approverNameAr: string;
  /**
   * Current locale
   * @default "en"
   */
  locale?: "en" | "ar";
  /**
   * Whether the banner can be dismissed
   * @default false
   */
  dismissible?: boolean;
  /**
   * Callback when banner is dismissed
   */
  onDismiss?: () => void;
  /**
   * Additional action button
   */
  action?: {
    labelEn: string;
    labelAr: string;
    onClick: () => void;
  };
  /**
   * Additional class name
   */
  className?: string;
}

interface LevelConfig {
  bgColor: string;
  borderColor: string;
  textColor: string;
  iconColor: string;
  darkBgColor: string;
  darkBorderColor: string;
  darkTextColor: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
}

const LEVEL_CONFIGS: Record<number, LevelConfig> = {
  [EscalationLevel.REMINDER]: {
    bgColor: "bg-warning-50",
    borderColor: "border-warning-300",
    textColor: "text-warning-800",
    iconColor: "text-warning-500",
    darkBgColor: "dark:bg-warning-900/20",
    darkBorderColor: "dark:border-warning-700",
    darkTextColor: "dark:text-warning-200",
    titleEn: "Reminder Sent",
    titleAr: "تم إرسال تذكير",
    descriptionEn: "A reminder has been sent to the approver",
    descriptionAr: "تم إرسال تذكير إلى المعتمد",
  },
  [EscalationLevel.MANAGER]: {
    bgColor: "bg-orange-50",
    borderColor: "border-orange-300",
    textColor: "text-orange-800",
    iconColor: "text-orange-500",
    darkBgColor: "dark:bg-orange-900/20",
    darkBorderColor: "dark:border-orange-700",
    darkTextColor: "dark:text-orange-200",
    titleEn: "Escalated to Manager",
    titleAr: "تم التصعيد للمدير",
    descriptionEn: "This request has been escalated to the manager",
    descriptionAr: "تم تصعيد هذا الطلب إلى المدير",
  },
  [EscalationLevel.HR]: {
    bgColor: "bg-error-50",
    borderColor: "border-error-300",
    textColor: "text-error-800",
    iconColor: "text-error-500",
    darkBgColor: "dark:bg-error-900/20",
    darkBorderColor: "dark:border-error-700",
    darkTextColor: "dark:text-error-200",
    titleEn: "Escalated to HR",
    titleAr: "تم التصعيد للموارد البشرية",
    descriptionEn: "This request has been escalated to HR",
    descriptionAr: "تم تصعيد هذا الطلب إلى الموارد البشرية",
  },
};

// Default config for unknown levels
const DEFAULT_CONFIG: LevelConfig = {
  bgColor: "bg-neutral-50",
  borderColor: "border-neutral-300",
  textColor: "text-neutral-800",
  iconColor: "text-neutral-500",
  darkBgColor: "dark:bg-neutral-800/50",
  darkBorderColor: "dark:border-neutral-700",
  darkTextColor: "dark:text-neutral-200",
  titleEn: "Pending",
  titleAr: "قيد الانتظار",
  descriptionEn: "This request is pending approval",
  descriptionAr: "هذا الطلب قيد الموافقة",
};

/**
 * Format hours to readable string
 */
function formatHoursPending(hours: number, locale: "en" | "ar"): string {
  if (hours < 1) {
    return locale === "ar" ? "أقل من ساعة" : "Less than an hour";
  }

  if (hours < 24) {
    const hourText = locale === "ar" ? "ساعة" : hours === 1 ? "hour" : "hours";
    return `${Math.floor(hours)} ${hourText}`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = Math.floor(hours % 24);

  if (locale === "ar") {
    if (remainingHours > 0) {
      return `${days} يوم و ${remainingHours} ساعة`;
    }
    return `${days} يوم`;
  }

  if (remainingHours > 0) {
    return `${days} ${days === 1 ? "day" : "days"} and ${remainingHours} ${remainingHours === 1 ? "hour" : "hours"}`;
  }
  return `${days} ${days === 1 ? "day" : "days"}`;
}

/**
 * Warning banner component for escalated requests.
 * Shows escalation level, time pending, and approver information.
 */
const EscalationBanner: React.FC<EscalationBannerProps> = ({
  level,
  hoursPending,
  approverNameEn,
  approverNameAr,
  locale = "en",
  dismissible = false,
  onDismiss,
  action,
  className,
}) => {
  const [isDismissed, setIsDismissed] = React.useState(false);
  const isArabic = locale === "ar";

  // Don't render if no escalation or dismissed
  if (level === EscalationLevel.NONE || isDismissed) {
    return null;
  }

  const config = LEVEL_CONFIGS[level] || DEFAULT_CONFIG;
  const approverName = isArabic ? approverNameAr : approverNameEn;

  const handleDismiss = () => {
    setIsDismissed(true);
    if (onDismiss) {
      onDismiss();
    }
  };

  return (
    <div
      className={cn(
        "relative flex items-start gap-4 p-4 rounded-lg border",
        config.bgColor,
        config.borderColor,
        config.darkBgColor,
        config.darkBorderColor,
        "animate-fade-in",
        className
      )}
      dir={isArabic ? "rtl" : "ltr"}
      role="alert"
      aria-live="polite"
    >
      {/* Icon */}
      <div
        className={cn(
          "flex-shrink-0 p-2 rounded-full",
          "bg-white/50 dark:bg-black/10",
          config.iconColor
        )}
      >
        {level === EscalationLevel.REMINDER ? (
          <Clock size={20} />
        ) : (
          <ArrowUp size={20} />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Title */}
        <div className="flex items-center gap-2 flex-wrap">
          <h4
            className={cn(
              "font-semibold",
              config.textColor,
              config.darkTextColor,
              isArabic && "font-arabic"
            )}
          >
            {isArabic ? config.titleAr : config.titleEn}
          </h4>

          {/* Escalation level badge */}
          <span
            className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5",
              "text-xs font-medium rounded-full",
              "bg-white/50 dark:bg-black/20",
              config.textColor,
              config.darkTextColor
            )}
          >
            <AlertTriangle size={12} />
            {isArabic ? `المستوى ${level}` : `Level ${level}`}
          </span>
        </div>

        {/* Description */}
        <p
          className={cn(
            "mt-1 text-sm",
            config.textColor,
            config.darkTextColor,
            "opacity-90",
            isArabic && "font-arabic"
          )}
        >
          {isArabic ? config.descriptionAr : config.descriptionEn}
        </p>

        {/* Details */}
        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
          {/* Approver */}
          <div className="flex items-center gap-1.5">
            <User size={14} className={cn(config.iconColor, "opacity-70")} />
            <span className={cn(config.textColor, config.darkTextColor, isArabic && "font-arabic")}>
              {approverName}
            </span>
          </div>

          {/* Time pending */}
          <div className="flex items-center gap-1.5">
            <Clock size={14} className={cn(config.iconColor, "opacity-70")} />
            <span className={cn(config.textColor, config.darkTextColor)}>
              {isArabic ? "قيد الانتظار منذ " : "Pending for "}
              <strong>{formatHoursPending(hoursPending, locale)}</strong>
            </span>
          </div>
        </div>

        {/* Action button */}
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className={cn(
              "mt-3 inline-flex items-center gap-1 px-3 py-1.5",
              "text-sm font-medium rounded-md",
              "bg-white dark:bg-neutral-800",
              "border",
              config.borderColor,
              config.darkBorderColor,
              config.textColor,
              config.darkTextColor,
              "hover:bg-opacity-80 transition-colors duration-150"
            )}
          >
            {isArabic ? action.labelAr : action.labelEn}
          </button>
        )}
      </div>

      {/* Dismiss button */}
      {dismissible && (
        <button
          type="button"
          onClick={handleDismiss}
          className={cn(
            "flex-shrink-0 p-1 rounded-full",
            "hover:bg-white/50 dark:hover:bg-black/20",
            config.textColor,
            config.darkTextColor,
            "opacity-60 hover:opacity-100",
            "transition-all duration-150"
          )}
          aria-label={isArabic ? "إغلاق" : "Dismiss"}
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
};

EscalationBanner.displayName = "EscalationBanner";

export { EscalationBanner };
