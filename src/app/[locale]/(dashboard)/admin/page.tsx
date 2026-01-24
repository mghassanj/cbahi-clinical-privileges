"use client";

import * as React from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { BentoGrid, BentoGridItem } from "@/components/dashboard/bento-grid";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  LiquidGlassCard,
  LiquidGlassCardContent,
  LiquidGlassCardHeader,
  LiquidGlassCardTitle,
} from "@/components/custom/liquid-glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Settings,
  RefreshCw,
  Clock,
  Database,
  Mail,
  Cloud,
  ChevronRight,
  Activity,
} from "lucide-react";

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  pendingRequests: number;
  totalDepartments: number;
}

interface SyncStatus {
  service: string;
  serviceAr: string;
  status: "connected" | "disconnected" | "syncing" | "error";
  lastSync: Date | null;
  nextSync?: Date;
  recordCount?: number;
}

interface RecentActivity {
  id: string;
  action: string;
  actionAr: string;
  details: string;
  detailsAr: string;
  timestamp: Date;
}

export default function AdminPage() {
  const t = useTranslations();
  const locale = useLocale();
  const isRTL = locale === "ar";

  const [isLoading, setIsLoading] = React.useState(true);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [stats, setStats] = React.useState<SystemStats>({
    totalUsers: 0,
    activeUsers: 0,
    pendingRequests: 0,
    totalDepartments: 0,
  });
  const [syncStatuses, setSyncStatuses] = React.useState<SyncStatus[]>([
    {
      service: "Jisr HR",
      serviceAr: "جسر للموارد البشرية",
      status: "connected",
      lastSync: null,
      recordCount: 0,
    },
    {
      service: "Email (SMTP)",
      serviceAr: "البريد الإلكتروني",
      status: "connected",
      lastSync: null,
    },
    {
      service: "Google Drive",
      serviceAr: "جوجل درايف",
      status: "connected",
      lastSync: null,
      recordCount: 0,
    },
  ]);
  const [recentActivity, setRecentActivity] = React.useState<RecentActivity[]>([]);

  React.useEffect(() => {
    async function fetchData() {
      try {
        // Fetch stats in parallel
        const [usersRes, requestsRes, configRes] = await Promise.all([
          fetch("/api/users?limit=1"),
          fetch("/api/requests?status=PENDING&status=IN_REVIEW&limit=1"),
          fetch("/api/config").catch(() => null),
        ]);

        const [usersData, requestsData, configData] = await Promise.all([
          usersRes.json(),
          requestsRes.json(),
          configRes?.json().catch(() => null),
        ]);

        // Calculate stats from API data
        setStats({
          totalUsers: usersData.pagination?.total || 0,
          activeUsers: usersData.pagination?.total || 0, // Could be filtered if we had active filter
          pendingRequests: requestsData.pagination?.total || 0,
          totalDepartments: 12, // Would need a departments API endpoint
        });

        // Update sync statuses from config if available
        if (configData) {
          setSyncStatuses((prev) => prev.map((sync) => ({
            ...sync,
            lastSync: configData.lastSync ? new Date(configData.lastSync) : null,
            status: "connected" as const,
            recordCount: sync.service.includes("Jisr") ? usersData.pagination?.total : sync.recordCount,
          })));
        }

        // Recent activity could be fetched from audit log if we had that endpoint
        setRecentActivity([]);
      } catch (error) {
        console.error("Failed to fetch admin data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullSync: true }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Sync failed");
      }

      // Update sync statuses with new data
      setSyncStatuses((prev) =>
        prev.map((sync) => ({
          ...sync,
          lastSync: new Date(),
          status: "connected" as const,
          recordCount: sync.service.includes("Jisr")
            ? result.data?.users?.recordsTotal || sync.recordCount
            : sync.recordCount,
        }))
      );

      toast.success(
        isRTL
          ? `تمت المزامنة بنجاح. تم تحديث ${result.data?.users?.recordsUpdated || 0} سجل.`
          : `Sync completed successfully. Updated ${result.data?.users?.recordsUpdated || 0} records.`
      );
    } catch (err) {
      console.error("Sync error:", err);
      toast.error(
        err instanceof Error
          ? err.message
          : isRTL
          ? "فشل في المزامنة"
          : "Sync failed"
      );
    } finally {
      setIsSyncing(false);
    }
  };

  const getStatusBadge = (status: SyncStatus["status"]) => {
    const config = {
      connected: { variant: "success" as const, label: isRTL ? "متصل" : "Connected" },
      disconnected: { variant: "error" as const, label: isRTL ? "غير متصل" : "Disconnected" },
      syncing: { variant: "warning" as const, label: isRTL ? "جارٍ المزامنة" : "Syncing" },
      error: { variant: "error" as const, label: isRTL ? "خطأ" : "Error" },
    };
    return <Badge variant={config[status].variant}>{config[status].label}</Badge>;
  };

  const formatSyncTime = (date: Date) => {
    const minutes = Math.floor((Date.now() - date.getTime()) / 1000 / 60);
    if (minutes < 1) return isRTL ? "الآن" : "Just now";
    if (minutes < 60) return isRTL ? `منذ ${minutes} دقيقة` : `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    return isRTL ? `منذ ${hours} ساعة` : `${hours} hours ago`;
  };

  if (isLoading) {
    return <AdminSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            {t("admin.title")}
          </h1>
          <p className="mt-1 text-neutral-500 dark:text-neutral-400">
            {isRTL ? "إدارة النظام والمستخدمين والإعدادات" : "Manage system, users, and settings"}
          </p>
        </div>
        <Button onClick={handleManualSync} isLoading={isSyncing}>
          <RefreshCw className={`mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0 ${isSyncing ? "animate-spin" : ""}`} />
          {t("admin.sync.syncNow")}
        </Button>
      </div>

      {/* Stats Grid */}
      <BentoGrid>
        <BentoGridItem>
          <StatCard
            title={isRTL ? "إجمالي المستخدمين" : "Total Users"}
            value={stats.totalUsers}
            icon={Users}
            variant="primary"
            description={`${stats.activeUsers} ${isRTL ? "نشط" : "active"}`}
          />
        </BentoGridItem>
        <BentoGridItem>
          <StatCard
            title={t("dashboard.pendingApprovals")}
            value={stats.pendingRequests}
            icon={Clock}
            variant="warning"
            description={isRTL ? "تتطلب الموافقة" : "Require approval"}
          />
        </BentoGridItem>
        <BentoGridItem>
          <StatCard
            title={isRTL ? "الأقسام" : "Departments"}
            value={stats.totalDepartments}
            icon={Database}
            variant="default"
            description={isRTL ? "قسم نشط" : "Active departments"}
          />
        </BentoGridItem>
        <BentoGridItem>
          <StatCard
            title={t("admin.sync.syncStatus")}
            value={
              syncStatuses.every((s) => s.status === "connected")
                ? isRTL
                  ? "سليم"
                  : "Healthy"
                : isRTL
                ? "يتطلب الانتباه"
                : "Needs Attention"
            }
            icon={Activity}
            variant={
              syncStatuses.every((s) => s.status === "connected")
                ? "success"
                : "warning"
            }
          />
        </BentoGridItem>
      </BentoGrid>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Links */}
        <LiquidGlassCard>
          <LiquidGlassCardHeader>
            <LiquidGlassCardTitle>
              {isRTL ? "روابط سريعة" : "Quick Links"}
            </LiquidGlassCardTitle>
          </LiquidGlassCardHeader>
          <LiquidGlassCardContent className="p-0">
            <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
              <Link
                href={`/${locale}/admin/users`}
                className="flex items-center justify-between p-4 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-400">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-white">
                      {t("admin.userManagement.title")}
                    </p>
                    <p className="text-sm text-neutral-500">
                      {isRTL ? "إدارة المستخدمين والأدوار" : "Manage users and roles"}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-neutral-400 rtl:rotate-180" />
              </Link>

              <Link
                href={`/${locale}/admin/settings`}
                className="flex items-center justify-between p-4 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary-100 text-secondary-600 dark:bg-secondary-900 dark:text-secondary-400">
                    <Settings className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-white">
                      {t("admin.systemSettings.title")}
                    </p>
                    <p className="text-sm text-neutral-500">
                      {isRTL ? "تكوين إعدادات النظام" : "Configure system settings"}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-neutral-400 rtl:rotate-180" />
              </Link>

              <Link
                href={`/${locale}/admin/settings#integrations`}
                className="flex items-center justify-between p-4 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success-100 text-success-600 dark:bg-success-900 dark:text-success-400">
                    <Cloud className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-white">
                      {t("admin.integrations.title")}
                    </p>
                    <p className="text-sm text-neutral-500">
                      {isRTL ? "إدارة التكاملات الخارجية" : "Manage external integrations"}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-neutral-400 rtl:rotate-180" />
              </Link>
            </div>
          </LiquidGlassCardContent>
        </LiquidGlassCard>

        {/* Sync Status */}
        <LiquidGlassCard>
          <LiquidGlassCardHeader>
            <LiquidGlassCardTitle>
              {t("admin.sync.syncStatus")}
            </LiquidGlassCardTitle>
          </LiquidGlassCardHeader>
          <LiquidGlassCardContent className="p-0">
            <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {syncStatuses.map((sync) => (
                <div
                  key={sync.service}
                  className="flex items-center justify-between p-4"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                        sync.status === "connected"
                          ? "bg-success-100 text-success-600"
                          : "bg-error-100 text-error-600"
                      }`}
                    >
                      {sync.service.includes("Jisr") ? (
                        <Database className="h-5 w-5" />
                      ) : sync.service.includes("Email") ? (
                        <Mail className="h-5 w-5" />
                      ) : (
                        <Cloud className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-neutral-900 dark:text-white">
                        {isRTL ? sync.serviceAr : sync.service}
                      </p>
                      <p className="text-sm text-neutral-500">
                        {t("admin.sync.lastSync")}:{" "}
                        {sync.lastSync ? formatSyncTime(sync.lastSync) : "-"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right rtl:text-left">
                    {getStatusBadge(sync.status)}
                    {sync.recordCount !== undefined && sync.recordCount > 0 && (
                      <p className="mt-1 text-xs text-neutral-500">
                        {sync.recordCount} {isRTL ? "سجل" : "records"}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </LiquidGlassCardContent>
        </LiquidGlassCard>
      </div>

      {/* Recent Activity */}
      <LiquidGlassCard>
        <LiquidGlassCardHeader>
          <LiquidGlassCardTitle>
            {isRTL ? "النشاط الأخير" : "Recent Admin Activity"}
          </LiquidGlassCardTitle>
        </LiquidGlassCardHeader>
        <LiquidGlassCardContent className="p-0">
          {recentActivity.length === 0 ? (
            <div className="p-8 text-center text-neutral-500">
              {isRTL ? "لا يوجد نشاط حديث" : "No recent activity"}
            </div>
          ) : (
            <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-600">
                    <Activity className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-neutral-900 dark:text-white">
                      {isRTL ? activity.actionAr : activity.action}
                    </p>
                    <p className="text-sm text-neutral-500">
                      {isRTL ? activity.detailsAr : activity.details}
                    </p>
                    <p className="mt-1 text-xs text-neutral-400">
                      {formatSyncTime(activity.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </LiquidGlassCardContent>
      </LiquidGlassCard>
    </div>
  );
}

function AdminSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}
