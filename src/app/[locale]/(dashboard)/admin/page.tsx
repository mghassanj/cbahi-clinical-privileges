"use client";

import * as React from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
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

// Mock data
const mockStats: SystemStats = {
  totalUsers: 156,
  activeUsers: 142,
  pendingRequests: 23,
  totalDepartments: 12,
};

const mockSyncStatuses: SyncStatus[] = [
  {
    service: "Jisr HR",
    serviceAr: "جسر للموارد البشرية",
    status: "connected",
    lastSync: new Date(Date.now() - 1000 * 60 * 30),
    nextSync: new Date(Date.now() + 1000 * 60 * 30),
    recordCount: 156,
  },
  {
    service: "Email (SMTP)",
    serviceAr: "البريد الإلكتروني",
    status: "connected",
    lastSync: new Date(Date.now() - 1000 * 60 * 5),
  },
  {
    service: "Google Drive",
    serviceAr: "جوجل درايف",
    status: "connected",
    lastSync: new Date(Date.now() - 1000 * 60 * 60),
    recordCount: 342,
  },
];

const mockRecentActivity = [
  {
    id: "1",
    action: "User synced",
    actionAr: "تمت مزامنة مستخدم",
    details: "New employee: Dr. Sara Ahmed",
    detailsAr: "موظف جديد: د. سارة أحمد",
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
  },
  {
    id: "2",
    action: "Role assigned",
    actionAr: "تم تعيين دور",
    details: "Dr. Mohammed Ali assigned as Approver",
    detailsAr: "تم تعيين د. محمد علي كمعتمد",
    timestamp: new Date(Date.now() - 1000 * 60 * 45),
  },
  {
    id: "3",
    action: "Settings updated",
    actionAr: "تم تحديث الإعدادات",
    details: "Email template modified",
    detailsAr: "تم تعديل قالب البريد",
    timestamp: new Date(Date.now() - 1000 * 60 * 120),
  },
];

export default function AdminPage() {
  const t = useTranslations();
  const locale = useLocale();
  const isRTL = locale === "ar";

  const [isLoading, setIsLoading] = React.useState(true);
  const [isSyncing, setIsSyncing] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    // TODO: API call for manual sync
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsSyncing(false);
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
            value={mockStats.totalUsers}
            icon={Users}
            variant="primary"
            description={`${mockStats.activeUsers} ${isRTL ? "نشط" : "active"}`}
          />
        </BentoGridItem>
        <BentoGridItem>
          <StatCard
            title={t("dashboard.pendingApprovals")}
            value={mockStats.pendingRequests}
            icon={Clock}
            variant="warning"
            description={isRTL ? "تتطلب الموافقة" : "Require approval"}
          />
        </BentoGridItem>
        <BentoGridItem>
          <StatCard
            title={isRTL ? "الأقسام" : "Departments"}
            value={mockStats.totalDepartments}
            icon={Database}
            variant="default"
            description={isRTL ? "قسم نشط" : "Active departments"}
          />
        </BentoGridItem>
        <BentoGridItem>
          <StatCard
            title={t("admin.sync.syncStatus")}
            value={
              mockSyncStatuses.every((s) => s.status === "connected")
                ? isRTL
                  ? "سليم"
                  : "Healthy"
                : isRTL
                ? "يتطلب الانتباه"
                : "Needs Attention"
            }
            icon={Activity}
            variant={
              mockSyncStatuses.every((s) => s.status === "connected")
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
              {mockSyncStatuses.map((sync) => (
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
                    {sync.recordCount !== undefined && (
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
          <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {mockRecentActivity.map((activity) => (
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
