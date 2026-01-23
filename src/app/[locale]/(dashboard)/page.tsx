"use client";

import * as React from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { BentoGrid, BentoGridItem } from "@/components/dashboard/bento-grid";
import { StatCard } from "@/components/dashboard/stat-card";
import { ActivityFeed, Activity } from "@/components/dashboard/activity-feed";
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
  FileText,
  CheckSquare,
  Clock,
  AlertTriangle,
  Plus,
  ArrowRight,
  Users,
  RefreshCw,
  TrendingUp,
  Activity as ActivityIcon,
} from "lucide-react";

// Mock data - replace with actual API calls
const mockStats = {
  employee: {
    myRequests: 5,
    pendingRequests: 2,
    approvedRequests: 3,
    draftRequests: 1,
  },
  approver: {
    pendingApprovals: 12,
    approvedToday: 5,
    escalated: 2,
    avgProcessingTime: 2.5,
  },
  admin: {
    totalUsers: 156,
    activeRequests: 45,
    lastSyncTime: new Date(Date.now() - 1000 * 60 * 30),
    syncStatus: "success" as const,
  },
};

const mockActivities: Activity[] = [
  {
    id: "1",
    type: "request_submitted",
    user: { name: "Dr. Sara Ahmed", nameAr: "د. سارة أحمد" },
    requestId: "REQ-2024-001",
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
  },
  {
    id: "2",
    type: "request_approved",
    user: { name: "Dr. Mohammed Ali", nameAr: "د. محمد علي" },
    requestId: "REQ-2024-002",
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
  },
  {
    id: "3",
    type: "request_pending",
    user: { name: "Dr. Fatima Hassan", nameAr: "د. فاطمة حسن" },
    requestId: "REQ-2024-003",
    timestamp: new Date(Date.now() - 1000 * 60 * 60),
  },
  {
    id: "4",
    type: "escalation",
    user: { name: "System", nameAr: "النظام" },
    requestId: "REQ-2024-004",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
  },
];

const mockPendingApprovals = [
  {
    id: "REQ-2024-005",
    applicant: "Dr. Ahmad Al-Harbi",
    applicantAr: "د. أحمد الحربي",
    type: "Initial",
    typeAr: "أولي",
    submittedDate: new Date(Date.now() - 1000 * 60 * 60 * 24),
    daysPending: 3,
    isEscalated: false,
  },
  {
    id: "REQ-2024-006",
    applicant: "Dr. Noura Al-Rashid",
    applicantAr: "د. نورة الراشد",
    type: "Renewal",
    typeAr: "تجديد",
    submittedDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
    daysPending: 5,
    isEscalated: true,
  },
  {
    id: "REQ-2024-007",
    applicant: "Dr. Khalid Omar",
    applicantAr: "د. خالد عمر",
    type: "Expansion",
    typeAr: "توسيع",
    submittedDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
    daysPending: 2,
    isEscalated: false,
  },
];

type UserRole = "employee" | "approver" | "admin";

export default function DashboardPage() {
  const t = useTranslations();
  const locale = useLocale();
  const isRTL = locale === "ar";
  const [isLoading, setIsLoading] = React.useState(true);

  // Mock user role - replace with actual session
  const userRole = "admin" as UserRole;
  const userName = isRTL ? "د. أحمد الراشد" : "Dr. Ahmed Al-Rashid";

  React.useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            {t("dashboard.welcome", { name: userName })}
          </h1>
          <p className="mt-1 text-neutral-500 dark:text-neutral-400">
            {t("dashboard.overview")}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/${locale}/requests/new`}>
            <Button>
              <Plus className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
              {t("dashboard.newRequest")}
            </Button>
          </Link>
        </div>
      </div>

      {/* Role-specific Dashboard Content */}
      {userRole === "employee" && <EmployeeDashboard />}
      {userRole === "approver" && <ApproverDashboard />}
      {userRole === "admin" && <AdminDashboard />}
    </div>
  );
}

function EmployeeDashboard() {
  const t = useTranslations();
  const locale = useLocale();
  const isRTL = locale === "ar";

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <BentoGrid>
        <BentoGridItem>
          <StatCard
            title={t("dashboard.statistics.totalRequests")}
            value={mockStats.employee.myRequests}
            icon={FileText}
            variant="primary"
            description={isRTL ? "إجمالي طلباتك" : "Your total requests"}
          />
        </BentoGridItem>
        <BentoGridItem>
          <StatCard
            title={t("dashboard.statistics.pendingRequests")}
            value={mockStats.employee.pendingRequests}
            icon={Clock}
            variant="warning"
            description={isRTL ? "في انتظار المراجعة" : "Awaiting review"}
          />
        </BentoGridItem>
        <BentoGridItem>
          <StatCard
            title={t("dashboard.statistics.approvedRequests")}
            value={mockStats.employee.approvedRequests}
            icon={CheckSquare}
            variant="success"
            description={isRTL ? "معتمد ونشط" : "Approved and active"}
          />
        </BentoGridItem>
        <BentoGridItem>
          <StatCard
            title={isRTL ? "المسودات" : "Drafts"}
            value={mockStats.employee.draftRequests}
            icon={FileText}
            variant="default"
            description={isRTL ? "طلبات غير مكتملة" : "Incomplete requests"}
          />
        </BentoGridItem>
      </BentoGrid>

      {/* Quick Actions and Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <LiquidGlassCard>
          <LiquidGlassCardHeader>
            <LiquidGlassCardTitle>
              {t("dashboard.quickActions")}
            </LiquidGlassCardTitle>
          </LiquidGlassCardHeader>
          <LiquidGlassCardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <Link href={`/${locale}/requests/new`}>
                <Button variant="outline" className="h-auto w-full flex-col gap-2 p-4">
                  <Plus className="h-6 w-6 text-primary-600" />
                  <span>{t("dashboard.newRequest")}</span>
                </Button>
              </Link>
              <Link href={`/${locale}/requests`}>
                <Button variant="outline" className="h-auto w-full flex-col gap-2 p-4">
                  <FileText className="h-6 w-6 text-primary-600" />
                  <span>{t("dashboard.viewAllRequests")}</span>
                </Button>
              </Link>
            </div>
          </LiquidGlassCardContent>
        </LiquidGlassCard>

        {/* Recent Activity */}
        <ActivityFeed
          activities={mockActivities.slice(0, 4)}
          showViewAll
          onViewAll={() => {}}
        />
      </div>
    </div>
  );
}

function ApproverDashboard() {
  const t = useTranslations();
  const locale = useLocale();
  const isRTL = locale === "ar";

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <BentoGrid>
        <BentoGridItem>
          <StatCard
            title={t("dashboard.pendingApprovals")}
            value={mockStats.approver.pendingApprovals}
            icon={CheckSquare}
            variant="warning"
            description={isRTL ? "تتطلب انتباهك" : "Require your attention"}
            onClick={() => {}}
          />
        </BentoGridItem>
        <BentoGridItem>
          <StatCard
            title={isRTL ? "تمت الموافقة اليوم" : "Approved Today"}
            value={mockStats.approver.approvedToday}
            icon={CheckSquare}
            variant="success"
            description={isRTL ? "طلبات تمت معالجتها" : "Requests processed"}
          />
        </BentoGridItem>
        <BentoGridItem>
          <StatCard
            title={isRTL ? "مصعد" : "Escalated"}
            value={mockStats.approver.escalated}
            icon={AlertTriangle}
            variant="error"
            description={isRTL ? "تجاوز الوقت المحدد" : "Overdue items"}
          />
        </BentoGridItem>
        <BentoGridItem>
          <StatCard
            title={t("dashboard.statistics.averageProcessingTime")}
            value={`${mockStats.approver.avgProcessingTime}d`}
            icon={Clock}
            variant="primary"
            description={isRTL ? "أيام للمعالجة" : "Days to process"}
          />
        </BentoGridItem>
      </BentoGrid>

      {/* Pending Approvals Queue Preview */}
      <LiquidGlassCard>
        <LiquidGlassCardHeader className="flex flex-row items-center justify-between">
          <LiquidGlassCardTitle>
            {t("approvals.pending")}
          </LiquidGlassCardTitle>
          <Link href={`/${locale}/approvals`}>
            <Button variant="ghost" size="sm">
              {t("dashboard.viewAllApprovals")}
              <ArrowRight className="ml-2 h-4 w-4 rtl:ml-0 rtl:mr-2 rtl:rotate-180" />
            </Button>
          </Link>
        </LiquidGlassCardHeader>
        <LiquidGlassCardContent className="p-0">
          <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {mockPendingApprovals.map((approval) => (
              <Link
                key={approval.id}
                href={`/${locale}/approvals/${approval.id}`}
                className="flex items-center justify-between p-4 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-neutral-900 dark:text-white">
                      {isRTL ? approval.applicantAr : approval.applicant}
                    </span>
                    {approval.isEscalated && (
                      <Badge variant="error">
                        <AlertTriangle className="mr-1 h-3 w-3" />
                        {isRTL ? "مصعد" : "Escalated"}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-sm text-neutral-500">
                    <span>{approval.id}</span>
                    <span>•</span>
                    <span>{isRTL ? approval.typeAr : approval.type}</span>
                  </div>
                </div>
                <div className="text-right rtl:text-left">
                  <Badge variant={approval.daysPending > 3 ? "warning" : "secondary"}>
                    {approval.daysPending} {isRTL ? "أيام" : "days"}
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        </LiquidGlassCardContent>
      </LiquidGlassCard>

      {/* Activity Feed */}
      <ActivityFeed
        activities={mockActivities}
        showViewAll
        onViewAll={() => {}}
      />
    </div>
  );
}

function AdminDashboard() {
  const t = useTranslations();
  const locale = useLocale();
  const isRTL = locale === "ar";

  const formatSyncTime = (date: Date) => {
    const minutes = Math.floor((Date.now() - date.getTime()) / 1000 / 60);
    if (minutes < 60) {
      return isRTL ? `منذ ${minutes} دقيقة` : `${minutes} min ago`;
    }
    const hours = Math.floor(minutes / 60);
    return isRTL ? `منذ ${hours} ساعة` : `${hours} hour ago`;
  };

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <BentoGrid>
        <BentoGridItem>
          <StatCard
            title={isRTL ? "إجمالي المستخدمين" : "Total Users"}
            value={mockStats.admin.totalUsers}
            icon={Users}
            variant="primary"
            trend={{ value: 12, isPositive: true }}
            description={isRTL ? "من الشهر الماضي" : "from last month"}
          />
        </BentoGridItem>
        <BentoGridItem>
          <StatCard
            title={isRTL ? "الطلبات النشطة" : "Active Requests"}
            value={mockStats.admin.activeRequests}
            icon={FileText}
            variant="warning"
            description={isRTL ? "قيد المعالجة" : "In progress"}
          />
        </BentoGridItem>
        <BentoGridItem>
          <StatCard
            title={t("dashboard.pendingApprovals")}
            value={mockStats.approver.pendingApprovals}
            icon={CheckSquare}
            variant="error"
            description={isRTL ? "تتطلب الموافقة" : "Require approval"}
          />
        </BentoGridItem>
        <BentoGridItem>
          <StatCard
            title={isRTL ? "حالة المزامنة" : "Sync Status"}
            value={mockStats.admin.syncStatus === "success" ? (isRTL ? "نجاح" : "OK") : (isRTL ? "فشل" : "Failed")}
            icon={RefreshCw}
            variant={mockStats.admin.syncStatus === "success" ? "success" : "error"}
            description={formatSyncTime(mockStats.admin.lastSyncTime)}
          />
        </BentoGridItem>
      </BentoGrid>

      {/* Admin Quick Links and Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Links */}
        <LiquidGlassCard>
          <LiquidGlassCardHeader>
            <LiquidGlassCardTitle>
              {t("dashboard.quickActions")}
            </LiquidGlassCardTitle>
          </LiquidGlassCardHeader>
          <LiquidGlassCardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <Link href={`/${locale}/admin/users`}>
                <Button variant="outline" className="h-auto w-full flex-col gap-2 p-4">
                  <Users className="h-6 w-6 text-primary-600" />
                  <span>{t("admin.userManagement.users")}</span>
                </Button>
              </Link>
              <Link href={`/${locale}/admin/settings`}>
                <Button variant="outline" className="h-auto w-full flex-col gap-2 p-4">
                  <ActivityIcon className="h-6 w-6 text-primary-600" />
                  <span>{t("admin.sync.title")}</span>
                </Button>
              </Link>
              <Link href={`/${locale}/approvals`}>
                <Button variant="outline" className="h-auto w-full flex-col gap-2 p-4">
                  <CheckSquare className="h-6 w-6 text-primary-600" />
                  <span>{t("common.navigation.approvals")}</span>
                </Button>
              </Link>
              <Link href={`/${locale}/admin/settings`}>
                <Button variant="outline" className="h-auto w-full flex-col gap-2 p-4">
                  <TrendingUp className="h-6 w-6 text-primary-600" />
                  <span>{isRTL ? "التقارير" : "Reports"}</span>
                </Button>
              </Link>
            </div>
          </LiquidGlassCardContent>
        </LiquidGlassCard>

        {/* System Status */}
        <LiquidGlassCard>
          <LiquidGlassCardHeader>
            <LiquidGlassCardTitle>
              {isRTL ? "حالة النظام" : "System Status"}
            </LiquidGlassCardTitle>
          </LiquidGlassCardHeader>
          <LiquidGlassCardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600 dark:text-neutral-400">
                  {t("admin.integrations.jisr.title")}
                </span>
                <Badge variant="success">
                  {t("admin.integrations.jisr.connected")}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600 dark:text-neutral-400">
                  {t("admin.integrations.email.title")}
                </span>
                <Badge variant="success">
                  {isRTL ? "نشط" : "Active"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600 dark:text-neutral-400">
                  {t("admin.integrations.google.title")}
                </span>
                <Badge variant="success">
                  {isRTL ? "متصل" : "Connected"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600 dark:text-neutral-400">
                  {t("admin.sync.lastSync")}
                </span>
                <span className="text-sm text-neutral-900 dark:text-white">
                  {formatSyncTime(mockStats.admin.lastSyncTime)}
                </span>
              </div>
              <Button variant="outline" className="w-full">
                <RefreshCw className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
                {t("admin.sync.syncNow")}
              </Button>
            </div>
          </LiquidGlassCardContent>
        </LiquidGlassCard>
      </div>

      {/* Recent Activity */}
      <ActivityFeed
        activities={mockActivities}
        showViewAll
        onViewAll={() => {}}
      />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="mt-2 h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}
