"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { cn, formatDate } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import {
  LiquidGlassCard,
  LiquidGlassCardContent,
  LiquidGlassCardHeader,
  LiquidGlassCardTitle,
} from "@/components/custom/liquid-glass-card";
import {
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  AlertTriangle,
} from "lucide-react";

type ActivityType =
  | "request_submitted"
  | "request_approved"
  | "request_rejected"
  | "request_returned"
  | "request_pending"
  | "escalation";

interface Activity {
  id: string;
  type: ActivityType;
  user: {
    name: string;
    nameAr?: string;
    avatar?: string;
  };
  requestId?: string;
  requestTitle?: string;
  timestamp: Date;
  description?: string;
}

interface ActivityFeedProps {
  activities: Activity[];
  title?: string;
  showViewAll?: boolean;
  onViewAll?: () => void;
  className?: string;
}

const activityIcons: Record<ActivityType, React.FC<{ className?: string }>> = {
  request_submitted: Send,
  request_approved: CheckCircle,
  request_rejected: XCircle,
  request_returned: AlertTriangle,
  request_pending: Clock,
  escalation: AlertTriangle,
};

const activityColors: Record<ActivityType, string> = {
  request_submitted: "text-primary-600 bg-primary-100 dark:text-primary-400 dark:bg-primary-900",
  request_approved: "text-success-600 bg-success-100 dark:text-success-400 dark:bg-success-900",
  request_rejected: "text-error-600 bg-error-100 dark:text-error-400 dark:bg-error-900",
  request_returned: "text-warning-600 bg-warning-100 dark:text-warning-400 dark:bg-warning-900",
  request_pending: "text-neutral-600 bg-neutral-100 dark:text-neutral-400 dark:bg-neutral-800",
  escalation: "text-warning-600 bg-warning-100 dark:text-warning-400 dark:bg-warning-900",
};

const ActivityFeed: React.FC<ActivityFeedProps> = ({
  activities,
  title,
  showViewAll = false,
  onViewAll,
  className,
}) => {
  const t = useTranslations();
  const locale = useLocale();
  const isRTL = locale === "ar";

  const getActivityMessage = (activity: Activity): string => {
    const userName = isRTL && activity.user.nameAr ? activity.user.nameAr : activity.user.name;

    switch (activity.type) {
      case "request_submitted":
        return isRTL
          ? `قام ${userName} بإرسال طلب امتياز جديد`
          : `${userName} submitted a new privilege request`;
      case "request_approved":
        return isRTL
          ? `تمت الموافقة على الطلب من قبل ${userName}`
          : `Request approved by ${userName}`;
      case "request_rejected":
        return isRTL
          ? `تم رفض الطلب من قبل ${userName}`
          : `Request rejected by ${userName}`;
      case "request_returned":
        return isRTL
          ? `تم إرجاع الطلب للتعديل من قبل ${userName}`
          : `Request returned for modifications by ${userName}`;
      case "request_pending":
        return isRTL
          ? `الطلب في انتظار مراجعة ${userName}`
          : `Request pending review by ${userName}`;
      case "escalation":
        return isRTL
          ? `تم تصعيد الطلب بسبب التأخير`
          : `Request escalated due to delay`;
      default:
        return activity.description || "";
    }
  };

  return (
    <LiquidGlassCard className={cn("h-full", className)}>
      <LiquidGlassCardHeader className="flex flex-row items-center justify-between">
        <LiquidGlassCardTitle>
          {title || t("dashboard.recentActivity")}
        </LiquidGlassCardTitle>
        {showViewAll && (
          <button
            onClick={onViewAll}
            className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
          >
            {isRTL ? "عرض الكل" : "View All"}
          </button>
        )}
      </LiquidGlassCardHeader>
      <LiquidGlassCardContent className="p-0">
        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {activities.length === 0 ? (
            <div className="p-6 text-center text-sm text-neutral-500">
              {t("common.messages.noData")}
            </div>
          ) : (
            activities.map((activity) => {
              const Icon = activityIcons[activity.type];
              return (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-4 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                      activityColors[activity.type]
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-neutral-700 dark:text-neutral-300">
                      {getActivityMessage(activity)}
                    </p>
                    {activity.requestId && (
                      <p className="mt-0.5 text-xs text-primary-600 dark:text-primary-400">
                        #{activity.requestId}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-neutral-500">
                      {formatDate(activity.timestamp, locale)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </LiquidGlassCardContent>
    </LiquidGlassCard>
  );
};

export { ActivityFeed };
export type { Activity, ActivityType };
