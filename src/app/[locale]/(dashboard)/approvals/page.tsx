"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { LiquidGlassCard } from "@/components/custom/liquid-glass-card";
import { DataTable, Column } from "@/components/dashboard/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LayoutGrid,
  List,
  Filter,
  AlertTriangle,
  Clock,
  ChevronRight,
} from "lucide-react";

interface PendingApproval {
  id: string;
  request: {
    id: string;
    type: string;
    applicant: {
      id: string;
      nameEn: string;
      nameAr: string;
      email: string;
      departmentEn: string | null;
      departmentAr: string | null;
    };
    requestedPrivileges: Array<{ privilege: { id: string } }>;
  };
  daysPending: number;
  isEscalated: boolean;
  escalationLevel: number;
  createdAt: string;
}

type ViewMode = "table" | "kanban";

export default function ApprovalsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const isRTL = locale === "ar";

  const [isLoading, setIsLoading] = React.useState(true);
  const [approvals, setApprovals] = React.useState<PendingApproval[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [viewMode, setViewMode] = React.useState<ViewMode>("table");
  const [departmentFilter, setDepartmentFilter] = React.useState<string>("all");
  const [priorityFilter, setPriorityFilter] = React.useState<string>("all");

  // Fetch approvals from API
  React.useEffect(() => {
    async function fetchApprovals() {
      try {
        setIsLoading(true);
        const response = await fetch("/api/approvals");

        if (!response.ok) {
          throw new Error("Failed to fetch approvals");
        }

        const result = await response.json();
        setApprovals(result.data || []);
      } catch (err) {
        console.error("Error fetching approvals:", err);
        setError("Failed to load approvals");
      } finally {
        setIsLoading(false);
      }
    }

    fetchApprovals();
  }, []);

  const filteredApprovals = React.useMemo(() => {
    return approvals.filter((approval) => {
      if (departmentFilter !== "all" && approval.request.applicant.departmentEn !== departmentFilter) return false;
      if (priorityFilter === "escalated" && !approval.isEscalated) return false;
      if (priorityFilter === "urgent" && approval.daysPending <= 3 && !approval.isEscalated) return false;
      if (priorityFilter === "normal" && (approval.daysPending > 3 || approval.isEscalated)) return false;
      return true;
    });
  }, [approvals, departmentFilter, priorityFilter]);

  const escalatedCount = approvals.filter((a) => a.isEscalated).length;

  const getTypeLabel = (type: string) => {
    return t(`request.types.${type}`);
  };

  const getPriorityBadge = (daysPending: number, isEscalated: boolean) => {
    if (isEscalated) {
      return (
        <Badge variant="error" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          {t("approvals.priority.escalated")}
        </Badge>
      );
    }
    if (daysPending > 5) {
      return (
        <Badge variant="warning">
          {t("approvals.priority.urgent")}
        </Badge>
      );
    }
    if (daysPending > 3) {
      return (
        <Badge variant="default">
          {t("approvals.priority.high")}
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">
        {t("approvals.priority.normal")}
      </Badge>
    );
  };

  const columns: Column<PendingApproval>[] = [
    {
      key: "applicant",
      header: "Applicant",
      headerAr: "مقدم الطلب",
      cell: (item) => (
        <div className="flex items-center gap-3">
          <Avatar name={item.request.applicant.nameEn} size="sm" />
          <div>
            <p className="font-medium text-neutral-900 dark:text-white">
              {isRTL ? item.request.applicant.nameAr || item.request.applicant.nameEn : item.request.applicant.nameEn}
            </p>
            <p className="text-sm text-neutral-500">
              {isRTL ? item.request.applicant.departmentAr || item.request.applicant.departmentEn : item.request.applicant.departmentEn || "-"}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "id",
      header: "Request ID",
      headerAr: "رقم الطلب",
      cell: (item) => (
        <span className="font-medium text-primary-600 dark:text-primary-400">
          {item.request.id.slice(0, 8)}...
        </span>
      ),
    },
    {
      key: "type",
      header: "Type",
      headerAr: "النوع",
      cell: (item) => (
        <Badge variant="outline">{getTypeLabel(item.request.type)}</Badge>
      ),
    },
    {
      key: "privilegeCount",
      header: "Privileges",
      headerAr: "الامتيازات",
      cell: (item) => (
        <span className="text-neutral-600 dark:text-neutral-400">
          {item.request.requestedPrivileges?.length || 0}
        </span>
      ),
    },
    {
      key: "daysPending",
      header: "Days Pending",
      headerAr: "أيام الانتظار",
      cell: (item) => (
        <div className="flex items-center gap-2">
          <Clock className={`h-4 w-4 ${item.daysPending > 3 ? "text-warning-500" : "text-neutral-400"}`} />
          <span className={item.daysPending > 3 ? "font-medium text-warning-600" : "text-neutral-600"}>
            {item.daysPending} {t("approvals.time.days")}
          </span>
        </div>
      ),
    },
    {
      key: "priority",
      header: "Priority",
      headerAr: "الأولوية",
      cell: (item) => getPriorityBadge(item.daysPending, item.isEscalated),
    },
    {
      key: "actions",
      header: "Actions",
      headerAr: "الإجراءات",
      cell: (item) => (
        <Link href={`/${locale}/approvals/${item.request.id}`}>
          <Button size="sm">
            {t("approvals.review")}
            <ChevronRight className="ml-1 h-4 w-4 rtl:ml-0 rtl:mr-1 rtl:rotate-180" />
          </Button>
        </Link>
      ),
    },
  ];

  const departments = Array.from(new Set(approvals.map((a) => a.request.applicant.departmentEn).filter(Boolean)));

  if (isLoading) {
    return <ApprovalsPageSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-neutral-500">{error}</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => window.location.reload()}
        >
          {t("common.actions.retry")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            {t("approvals.title")}
          </h1>
          <p className="mt-1 text-neutral-500 dark:text-neutral-400">
            {t("approvals.description", { count: approvals.length })}
            {escalatedCount > 0 && (
              <span className="ml-2 text-error-600 dark:text-error-400 rtl:mr-2 rtl:ml-0">
                ({t("approvals.escalatedCount", { count: escalatedCount })})
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "table" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("table")}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "kanban" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("kanban")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-neutral-500" />
          <span className="text-sm text-neutral-600 dark:text-neutral-400">
            {t("common.actions.filter")}:
          </span>
        </div>
        <Select
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          className="w-44"
        >
          <option value="all">{t("approvals.filters.allDepartments")}</option>
          {departments.map((dept) => (
            <option key={dept} value={dept || ""}>
              {dept}
            </option>
          ))}
        </Select>
        <Select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="w-36"
        >
          <option value="all">{t("approvals.filters.allPriorities")}</option>
          <option value="escalated">{t("approvals.priority.escalated")}</option>
          <option value="urgent">{t("approvals.priority.urgent")}</option>
          <option value="normal">{t("approvals.priority.normal")}</option>
        </Select>
        {(departmentFilter !== "all" || priorityFilter !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setDepartmentFilter("all");
              setPriorityFilter("all");
            }}
          >
            {t("common.actions.reset")}
          </Button>
        )}
      </div>

      {/* Content */}
      {viewMode === "table" ? (
        <DataTable
          data={filteredApprovals}
          columns={columns}
          searchPlaceholder={t("approvals.searchPlaceholder")}
          searchKey="id"
          emptyMessage={t("approvals.noPendingApprovals")}
          onRowClick={(item) => router.push(`/${locale}/approvals/${item.request.id}`)}
        />
      ) : (
        <KanbanView approvals={filteredApprovals} />
      )}
    </div>
  );
}

function KanbanView({ approvals }: { approvals: PendingApproval[] }) {
  const t = useTranslations();
  const locale = useLocale();
  const isRTL = locale === "ar";

  const urgentItems = approvals.filter((a) => a.isEscalated || a.daysPending > 5);
  const highItems = approvals.filter((a) => !a.isEscalated && a.daysPending > 3 && a.daysPending <= 5);
  const normalItems = approvals.filter((a) => !a.isEscalated && a.daysPending <= 3);

  const getTypeLabel = (type: string) => {
    return t(`request.types.${type}`);
  };

  const KanbanColumn = ({
    title,
    items,
    variant,
  }: {
    title: string;
    items: PendingApproval[];
    variant: "error" | "warning" | "default";
  }) => {
    const colors = {
      error: "border-error-200 bg-error-50/50 dark:border-error-800 dark:bg-error-900/20",
      warning: "border-warning-200 bg-warning-50/50 dark:border-warning-800 dark:bg-warning-900/20",
      default: "border-neutral-200 bg-neutral-50/50 dark:border-neutral-800 dark:bg-neutral-900/20",
    };

    return (
      <div className={`rounded-xl border-2 ${colors[variant]} p-4`}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-neutral-900 dark:text-white">
            {title}
          </h3>
          <Badge variant={variant === "error" ? "error" : variant === "warning" ? "warning" : "secondary"}>
            {items.length}
          </Badge>
        </div>
        <div className="space-y-3">
          {items.map((item) => (
            <Link key={item.id} href={`/${locale}/approvals/${item.request.id}`}>
              <LiquidGlassCard hover className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar name={item.request.applicant.nameEn} size="sm" />
                    <div>
                      <p className="font-medium text-neutral-900 dark:text-white">
                        {isRTL ? item.request.applicant.nameAr || item.request.applicant.nameEn : item.request.applicant.nameEn}
                      </p>
                      <p className="text-xs text-neutral-500">{item.request.id.slice(0, 8)}...</p>
                    </div>
                  </div>
                  {item.isEscalated && (
                    <AlertTriangle className="h-4 w-4 text-error-500" />
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <Badge variant="outline" className="text-xs">
                    {getTypeLabel(item.request.type)}
                  </Badge>
                  <span className="text-neutral-500">
                    {item.daysPending} {t("approvals.time.days")}
                  </span>
                </div>
              </LiquidGlassCard>
            </Link>
          ))}
          {items.length === 0 && (
            <p className="py-8 text-center text-sm text-neutral-500">
              {t("approvals.noItems")}
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <KanbanColumn
        title={t("approvals.kanban.urgentEscalated")}
        items={urgentItems}
        variant="error"
      />
      <KanbanColumn
        title={t("approvals.kanban.highPriority")}
        items={highItems}
        variant="warning"
      />
      <KanbanColumn
        title={t("approvals.kanban.normal")}
        items={normalItems}
        variant="default"
      />
    </div>
  );
}

function ApprovalsPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-10" />
        </div>
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-10 w-44" />
        <Skeleton className="h-10 w-36" />
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}
