"use client";

import * as React from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
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

// Types for API responses
interface EmployeeStats {
  total: number;
  pending: number;
  approved: number;
  draft: number;
  inReview: number;
  rejected: number;
}

interface ApproverStats {
  pending: number;
  approvedToday: number;
  escalated: number;
}

interface AdminStats {
  totalUsers: number;
  activeRequests: number;
  pendingApprovals: number;
}

interface PendingApproval {
  id: string;
  requestId: string;
  daysPending: number;
  isEscalated: boolean;
  request: {
    id: string;
    type: string;
    applicant: {
      nameEn: string;
      nameAr: string;
    };
  };
}

type UserRole = "employee" | "approver" | "admin";

export default function DashboardPage() {
  const t = useTranslations();
  const locale = useLocale();
  const isRTL = locale === "ar";
  const { data: session, status } = useSession();

  // Map Prisma role to dashboard role type
  const mapRole = (role: string): UserRole => {
    if (role === "ADMIN") return "admin";
    if (["MEDICAL_DIRECTOR", "HEAD_OF_DEPT", "HEAD_OF_SECTION", "COMMITTEE_MEMBER"].includes(role)) {
      return "approver";
    }
    return "employee";
  };

  // Get user data from session
  const userRole = session?.user?.role ? mapRole(session.user.role) : "employee";
  const userName = isRTL && session?.user?.nameAr
    ? session.user.nameAr
    : session?.user?.name || "";

  if (status === "loading") {
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
  const [stats, setStats] = React.useState<EmployeeStats>({
    total: 0,
    pending: 0,
    approved: 0,
    draft: 0,
    inReview: 0,
    rejected: 0,
  });
  const [activities, setActivities] = React.useState<Activity[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchData() {
      try {
        // Fetch all requests for the current user to calculate stats
        const response = await fetch("/api/requests?limit=100");
        const result = await response.json();

        if (result.data) {
          const requests = result.data;
          const newStats: EmployeeStats = {
            total: requests.length,
            pending: requests.filter((r: { status: string }) => r.status === "PENDING").length,
            approved: requests.filter((r: { status: string }) => r.status === "APPROVED").length,
            draft: requests.filter((r: { status: string }) => r.status === "DRAFT").length,
            inReview: requests.filter((r: { status: string }) => r.status === "IN_REVIEW").length,
            rejected: requests.filter((r: { status: string }) => r.status === "REJECTED").length,
          };
          setStats(newStats);

          // Convert recent requests to activities
          const recentActivities: Activity[] = requests.slice(0, 4).map((req: {
            id: string;
            status: string;
            applicant: { nameEn: string; nameAr: string };
            createdAt: string;
            submittedAt: string | null;
          }) => ({
            id: req.id,
            type: req.status === "APPROVED" ? "request_approved"
                : req.status === "PENDING" ? "request_pending"
                : req.status === "REJECTED" ? "request_rejected"
                : "request_submitted",
            user: { name: req.applicant.nameEn, nameAr: req.applicant.nameAr },
            requestId: req.id,
            timestamp: new Date(req.submittedAt || req.createdAt),
          }));
          setActivities(recentActivities);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
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

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <BentoGrid>
        <BentoGridItem>
          <StatCard
            title={t("dashboard.statistics.totalRequests")}
            value={stats.total}
            icon={FileText}
            variant="primary"
            description={isRTL ? "إجمالي طلباتك" : "Your total requests"}
          />
        </BentoGridItem>
        <BentoGridItem>
          <StatCard
            title={t("dashboard.statistics.pendingRequests")}
            value={stats.pending + stats.inReview}
            icon={Clock}
            variant="warning"
            description={isRTL ? "في انتظار المراجعة" : "Awaiting review"}
          />
        </BentoGridItem>
        <BentoGridItem>
          <StatCard
            title={t("dashboard.statistics.approvedRequests")}
            value={stats.approved}
            icon={CheckSquare}
            variant="success"
            description={isRTL ? "معتمد ونشط" : "Approved and active"}
          />
        </BentoGridItem>
        <BentoGridItem>
          <StatCard
            title={isRTL ? "المسودات" : "Drafts"}
            value={stats.draft}
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
          activities={activities}
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
  const [stats, setStats] = React.useState<ApproverStats>({
    pending: 0,
    approvedToday: 0,
    escalated: 0,
  });
  const [pendingApprovals, setPendingApprovals] = React.useState<PendingApproval[]>([]);
  const [activities, setActivities] = React.useState<Activity[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchData() {
      try {
        // Fetch pending approvals
        const response = await fetch("/api/approvals?limit=10");
        const result = await response.json();

        if (result.data) {
          setPendingApprovals(result.data.slice(0, 3));

          // Calculate stats
          const escalatedCount = result.data.filter((a: { isEscalated: boolean }) => a.isEscalated).length;
          setStats({
            pending: result.statistics?.pending || result.data.length,
            approvedToday: result.statistics?.approved || 0,
            escalated: escalatedCount,
          });

          // Convert to activities
          const recentActivities: Activity[] = result.data.slice(0, 4).map((approval: PendingApproval) => ({
            id: approval.id,
            type: "request_pending" as const,
            user: {
              name: approval.request.applicant.nameEn,
              nameAr: approval.request.applicant.nameAr,
            },
            requestId: approval.request.id,
            timestamp: new Date(),
          }));
          setActivities(recentActivities);
        }
      } catch (error) {
        console.error("Failed to fetch approver dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const getTypeLabel = (type: string) => {
    const labels: Record<string, { en: string; ar: string }> = {
      NEW: { en: "Initial", ar: "أولي" },
      RENEWAL: { en: "Renewal", ar: "تجديد" },
      ADDITION: { en: "Expansion", ar: "توسيع" },
      TEMPORARY: { en: "Temporary", ar: "مؤقت" },
    };
    return isRTL ? labels[type]?.ar || type : labels[type]?.en || type;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <BentoGrid>
        <BentoGridItem>
          <StatCard
            title={t("dashboard.pendingApprovals")}
            value={stats.pending}
            icon={CheckSquare}
            variant="warning"
            description={isRTL ? "تتطلب انتباهك" : "Require your attention"}
          />
        </BentoGridItem>
        <BentoGridItem>
          <StatCard
            title={isRTL ? "تمت الموافقة" : "Approved"}
            value={stats.approvedToday}
            icon={CheckSquare}
            variant="success"
            description={isRTL ? "طلبات تمت معالجتها" : "Requests processed"}
          />
        </BentoGridItem>
        <BentoGridItem>
          <StatCard
            title={isRTL ? "مصعد" : "Escalated"}
            value={stats.escalated}
            icon={AlertTriangle}
            variant="error"
            description={isRTL ? "تجاوز الوقت المحدد" : "Overdue items"}
          />
        </BentoGridItem>
        <BentoGridItem>
          <StatCard
            title={t("dashboard.statistics.averageProcessingTime")}
            value={pendingApprovals.length > 0
              ? `${Math.round(pendingApprovals.reduce((sum, a) => sum + a.daysPending, 0) / pendingApprovals.length)}d`
              : "0d"}
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
          {pendingApprovals.length === 0 ? (
            <div className="p-8 text-center text-neutral-500">
              {isRTL ? "لا توجد موافقات معلقة" : "No pending approvals"}
            </div>
          ) : (
            <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {pendingApprovals.map((approval) => (
                <Link
                  key={approval.id}
                  href={`/${locale}/approvals/${approval.request.id}`}
                  className="flex items-center justify-between p-4 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-neutral-900 dark:text-white">
                        {isRTL ? approval.request.applicant.nameAr : approval.request.applicant.nameEn}
                      </span>
                      {approval.isEscalated && (
                        <Badge variant="error">
                          <AlertTriangle className="mr-1 h-3 w-3" />
                          {isRTL ? "مصعد" : "Escalated"}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-sm text-neutral-500">
                      <span>{approval.request.id}</span>
                      <span>•</span>
                      <span>{getTypeLabel(approval.request.type)}</span>
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
          )}
        </LiquidGlassCardContent>
      </LiquidGlassCard>

      {/* Activity Feed */}
      <ActivityFeed
        activities={activities}
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
  const [stats, setStats] = React.useState<AdminStats>({
    totalUsers: 0,
    activeRequests: 0,
    pendingApprovals: 0,
  });
  const [lastSyncTime, setLastSyncTime] = React.useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = React.useState<"success" | "error">("success");
  const [activities, setActivities] = React.useState<Activity[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchData() {
      try {
        // Fetch data in parallel
        const [usersRes, requestsRes, approvalsRes, configRes] = await Promise.all([
          fetch("/api/users?limit=1"),
          fetch("/api/requests?status=PENDING&status=IN_REVIEW&limit=1"),
          fetch("/api/approvals?limit=5"),
          fetch("/api/config").catch(() => null),
        ]);

        const [usersData, requestsData, approvalsData, configData] = await Promise.all([
          usersRes.json(),
          requestsRes.json(),
          approvalsRes.json(),
          configRes?.json().catch(() => null),
        ]);

        setStats({
          totalUsers: usersData.pagination?.total || 0,
          activeRequests: requestsData.pagination?.total || 0,
          pendingApprovals: approvalsData.statistics?.pending || approvalsData.pagination?.total || 0,
        });

        // Get sync status from config if available
        if (configData?.lastSync) {
          setLastSyncTime(new Date(configData.lastSync));
          setSyncStatus(configData.syncStatus || "success");
        }

        // Convert approvals to activities
        if (approvalsData.data) {
          const recentActivities: Activity[] = approvalsData.data.slice(0, 4).map((approval: PendingApproval) => ({
            id: approval.id,
            type: "request_pending" as const,
            user: {
              name: approval.request.applicant.nameEn,
              nameAr: approval.request.applicant.nameAr,
            },
            requestId: approval.request.id,
            timestamp: new Date(),
          }));
          setActivities(recentActivities);
        }
      } catch (error) {
        console.error("Failed to fetch admin dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const formatSyncTime = (date: Date | null) => {
    if (!date) return isRTL ? "غير متاح" : "N/A";
    const minutes = Math.floor((Date.now() - date.getTime()) / 1000 / 60);
    if (minutes < 60) {
      return isRTL ? `منذ ${minutes} دقيقة` : `${minutes} min ago`;
    }
    const hours = Math.floor(minutes / 60);
    return isRTL ? `منذ ${hours} ساعة` : `${hours} hour ago`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
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

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <BentoGrid>
        <BentoGridItem>
          <StatCard
            title={isRTL ? "إجمالي المستخدمين" : "Total Users"}
            value={stats.totalUsers}
            icon={Users}
            variant="primary"
            description={isRTL ? "المستخدمون المسجلون" : "Registered users"}
          />
        </BentoGridItem>
        <BentoGridItem>
          <StatCard
            title={isRTL ? "الطلبات النشطة" : "Active Requests"}
            value={stats.activeRequests}
            icon={FileText}
            variant="warning"
            description={isRTL ? "قيد المعالجة" : "In progress"}
          />
        </BentoGridItem>
        <BentoGridItem>
          <StatCard
            title={t("dashboard.pendingApprovals")}
            value={stats.pendingApprovals}
            icon={CheckSquare}
            variant="error"
            description={isRTL ? "تتطلب الموافقة" : "Require approval"}
          />
        </BentoGridItem>
        <BentoGridItem>
          <StatCard
            title={isRTL ? "حالة المزامنة" : "Sync Status"}
            value={syncStatus === "success" ? (isRTL ? "نجاح" : "OK") : (isRTL ? "فشل" : "Failed")}
            icon={RefreshCw}
            variant={syncStatus === "success" ? "success" : "error"}
            description={formatSyncTime(lastSyncTime)}
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
                  {formatSyncTime(lastSyncTime)}
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
        activities={activities}
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
