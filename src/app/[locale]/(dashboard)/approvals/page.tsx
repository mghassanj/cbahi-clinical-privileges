"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  LiquidGlassCard,
  LiquidGlassCardContent,
  LiquidGlassCardHeader,
  LiquidGlassCardTitle,
} from "@/components/custom/liquid-glass-card";
import { DataTable, Column } from "@/components/dashboard/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Select } from "@/components/ui/select";
import { formatDate } from "@/lib/utils";
import {
  LayoutGrid,
  List,
  Filter,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  ChevronRight,
  ArrowRight,
} from "lucide-react";

type ApprovalStatus = "pending" | "approved" | "rejected";

interface PendingApproval {
  id: string;
  applicant: {
    name: string;
    nameAr: string;
    email: string;
    department: string;
    departmentAr: string;
    avatar?: string;
  };
  type: "initial" | "renewal" | "expansion" | "temporary";
  submittedDate: Date;
  daysPending: number;
  privilegeCount: number;
  isEscalated: boolean;
  priority: "normal" | "high" | "urgent";
}

// Mock data
const mockApprovals: PendingApproval[] = [
  {
    id: "REQ-2024-010",
    applicant: {
      name: "Dr. Sara Ahmed",
      nameAr: "د. سارة أحمد",
      email: "sara@hospital.com",
      department: "Orthodontics",
      departmentAr: "تقويم الأسنان",
    },
    type: "initial",
    submittedDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1),
    daysPending: 1,
    privilegeCount: 28,
    isEscalated: false,
    priority: "normal",
  },
  {
    id: "REQ-2024-011",
    applicant: {
      name: "Dr. Mohammed Ali",
      nameAr: "د. محمد علي",
      email: "mohammed@hospital.com",
      department: "Oral Surgery",
      departmentAr: "جراحة الفم",
    },
    type: "expansion",
    submittedDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
    daysPending: 5,
    privilegeCount: 12,
    isEscalated: true,
    priority: "urgent",
  },
  {
    id: "REQ-2024-012",
    applicant: {
      name: "Dr. Fatima Hassan",
      nameAr: "د. فاطمة حسن",
      email: "fatima@hospital.com",
      department: "Periodontics",
      departmentAr: "علاج اللثة",
    },
    type: "renewal",
    submittedDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
    daysPending: 3,
    privilegeCount: 35,
    isEscalated: false,
    priority: "high",
  },
  {
    id: "REQ-2024-013",
    applicant: {
      name: "Dr. Ahmad Al-Harbi",
      nameAr: "د. أحمد الحربي",
      email: "ahmad@hospital.com",
      department: "Endodontics",
      departmentAr: "علاج الجذور",
    },
    type: "temporary",
    submittedDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
    daysPending: 2,
    privilegeCount: 8,
    isEscalated: false,
    priority: "normal",
  },
  {
    id: "REQ-2024-014",
    applicant: {
      name: "Dr. Noura Al-Rashid",
      nameAr: "د. نورة الراشد",
      email: "noura@hospital.com",
      department: "Prosthodontics",
      departmentAr: "الاستعاضة السنية",
    },
    type: "initial",
    submittedDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4),
    daysPending: 4,
    privilegeCount: 42,
    isEscalated: true,
    priority: "urgent",
  },
];

type ViewMode = "table" | "kanban";

export default function ApprovalsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const isRTL = locale === "ar";

  const [viewMode, setViewMode] = React.useState<ViewMode>("table");
  const [departmentFilter, setDepartmentFilter] = React.useState<string>("all");
  const [priorityFilter, setPriorityFilter] = React.useState<string>("all");

  const filteredApprovals = React.useMemo(() => {
    return mockApprovals.filter((approval) => {
      if (departmentFilter !== "all" && approval.applicant.department !== departmentFilter) return false;
      if (priorityFilter !== "all" && approval.priority !== priorityFilter) return false;
      return true;
    });
  }, [departmentFilter, priorityFilter]);

  const escalatedCount = mockApprovals.filter((a) => a.isEscalated).length;

  const getTypeLabel = (type: string) => {
    const labels: Record<string, { en: string; ar: string }> = {
      initial: { en: "Initial", ar: "أولي" },
      renewal: { en: "Renewal", ar: "تجديد" },
      expansion: { en: "Expansion", ar: "توسيع" },
      temporary: { en: "Temporary", ar: "مؤقت" },
    };
    return isRTL ? labels[type]?.ar : labels[type]?.en;
  };

  const getPriorityBadge = (priority: string, isEscalated: boolean) => {
    if (isEscalated) {
      return (
        <Badge variant="error" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          {isRTL ? "مصعد" : "Escalated"}
        </Badge>
      );
    }
    const variants: Record<string, "warning" | "default" | "secondary"> = {
      urgent: "warning",
      high: "default",
      normal: "secondary",
    };
    const labels: Record<string, { en: string; ar: string }> = {
      urgent: { en: "Urgent", ar: "عاجل" },
      high: { en: "High", ar: "عالي" },
      normal: { en: "Normal", ar: "عادي" },
    };
    return (
      <Badge variant={variants[priority]}>
        {isRTL ? labels[priority]?.ar : labels[priority]?.en}
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
          <Avatar name={item.applicant.name} size="sm" />
          <div>
            <p className="font-medium text-neutral-900 dark:text-white">
              {isRTL ? item.applicant.nameAr : item.applicant.name}
            </p>
            <p className="text-sm text-neutral-500">
              {isRTL ? item.applicant.departmentAr : item.applicant.department}
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
          {item.id}
        </span>
      ),
    },
    {
      key: "type",
      header: "Type",
      headerAr: "النوع",
      cell: (item) => (
        <Badge variant="outline">{getTypeLabel(item.type)}</Badge>
      ),
    },
    {
      key: "privilegeCount",
      header: "Privileges",
      headerAr: "الامتيازات",
      cell: (item) => (
        <span className="text-neutral-600 dark:text-neutral-400">
          {item.privilegeCount}
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
            {item.daysPending} {isRTL ? "أيام" : "days"}
          </span>
        </div>
      ),
    },
    {
      key: "priority",
      header: "Priority",
      headerAr: "الأولوية",
      cell: (item) => getPriorityBadge(item.priority, item.isEscalated),
    },
    {
      key: "actions",
      header: "Actions",
      headerAr: "الإجراءات",
      cell: (item) => (
        <Link href={`/${locale}/approvals/${item.id}`}>
          <Button size="sm">
            {isRTL ? "مراجعة" : "Review"}
            <ChevronRight className="ml-1 h-4 w-4 rtl:ml-0 rtl:mr-1 rtl:rotate-180" />
          </Button>
        </Link>
      ),
    },
  ];

  const departments = [...new Set(mockApprovals.map((a) => a.applicant.department))];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            {t("approvals.title")}
          </h1>
          <p className="mt-1 text-neutral-500 dark:text-neutral-400">
            {mockApprovals.length} {isRTL ? "طلب في انتظار موافقتك" : "requests awaiting your approval"}
            {escalatedCount > 0 && (
              <span className="ml-2 text-error-600 dark:text-error-400">
                ({escalatedCount} {isRTL ? "مصعد" : "escalated"})
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
          <option value="all">{isRTL ? "كل الأقسام" : "All Departments"}</option>
          {departments.map((dept) => (
            <option key={dept} value={dept}>
              {dept}
            </option>
          ))}
        </Select>
        <Select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="w-36"
        >
          <option value="all">{isRTL ? "كل الأولويات" : "All Priorities"}</option>
          <option value="urgent">{isRTL ? "عاجل" : "Urgent"}</option>
          <option value="high">{isRTL ? "عالي" : "High"}</option>
          <option value="normal">{isRTL ? "عادي" : "Normal"}</option>
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
          searchPlaceholder={isRTL ? "البحث عن طلب..." : "Search requests..."}
          searchKey="id"
          emptyMessage={isRTL ? "لا توجد طلبات معلقة" : "No pending approvals"}
          onRowClick={(item) => router.push(`/${locale}/approvals/${item.id}`)}
        />
      ) : (
        <KanbanView approvals={filteredApprovals} />
      )}
    </div>
  );
}

function KanbanView({ approvals }: { approvals: PendingApproval[] }) {
  const locale = useLocale();
  const isRTL = locale === "ar";

  const urgentItems = approvals.filter((a) => a.isEscalated || a.priority === "urgent");
  const highItems = approvals.filter((a) => !a.isEscalated && a.priority === "high");
  const normalItems = approvals.filter((a) => !a.isEscalated && a.priority === "normal");

  const getTypeLabel = (type: string) => {
    const labels: Record<string, { en: string; ar: string }> = {
      initial: { en: "Initial", ar: "أولي" },
      renewal: { en: "Renewal", ar: "تجديد" },
      expansion: { en: "Expansion", ar: "توسيع" },
      temporary: { en: "Temporary", ar: "مؤقت" },
    };
    return isRTL ? labels[type]?.ar : labels[type]?.en;
  };

  const KanbanColumn = ({
    title,
    titleAr,
    items,
    variant,
  }: {
    title: string;
    titleAr: string;
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
            {isRTL ? titleAr : title}
          </h3>
          <Badge variant={variant === "error" ? "error" : variant === "warning" ? "warning" : "secondary"}>
            {items.length}
          </Badge>
        </div>
        <div className="space-y-3">
          {items.map((item) => (
            <Link key={item.id} href={`/${locale}/approvals/${item.id}`}>
              <LiquidGlassCard hover className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar name={item.applicant.name} size="sm" />
                    <div>
                      <p className="font-medium text-neutral-900 dark:text-white">
                        {isRTL ? item.applicant.nameAr : item.applicant.name}
                      </p>
                      <p className="text-xs text-neutral-500">{item.id}</p>
                    </div>
                  </div>
                  {item.isEscalated && (
                    <AlertTriangle className="h-4 w-4 text-error-500" />
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <Badge variant="outline" className="text-xs">
                    {getTypeLabel(item.type)}
                  </Badge>
                  <span className="text-neutral-500">
                    {item.daysPending} {isRTL ? "أيام" : "days"}
                  </span>
                </div>
              </LiquidGlassCard>
            </Link>
          ))}
          {items.length === 0 && (
            <p className="py-8 text-center text-sm text-neutral-500">
              {isRTL ? "لا توجد عناصر" : "No items"}
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <KanbanColumn
        title="Urgent / Escalated"
        titleAr="عاجل / مصعد"
        items={urgentItems}
        variant="error"
      />
      <KanbanColumn
        title="High Priority"
        titleAr="أولوية عالية"
        items={highItems}
        variant="warning"
      />
      <KanbanColumn
        title="Normal"
        titleAr="عادي"
        items={normalItems}
        variant="default"
      />
    </div>
  );
}
