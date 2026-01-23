"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { DataTable, Column } from "@/components/dashboard/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { formatDate } from "@/lib/utils";
import {
  Plus,
  Eye,
  Pencil,
  Trash2,
  Filter,
} from "lucide-react";

type RequestStatus = "draft" | "pending" | "in_review" | "approved" | "rejected" | "cancelled";
type RequestType = "initial" | "renewal" | "expansion" | "temporary";

interface PrivilegeRequest {
  id: string;
  type: RequestType;
  status: RequestStatus;
  submittedDate: Date | null;
  createdDate: Date;
  privilegeCount: number;
  currentApprover?: string;
  currentApproverAr?: string;
}

// Mock data - replace with API calls
const mockRequests: PrivilegeRequest[] = [
  {
    id: "REQ-2024-001",
    type: "initial",
    status: "approved",
    submittedDate: new Date(2024, 0, 15),
    createdDate: new Date(2024, 0, 10),
    privilegeCount: 25,
  },
  {
    id: "REQ-2024-002",
    type: "renewal",
    status: "pending",
    submittedDate: new Date(2024, 1, 20),
    createdDate: new Date(2024, 1, 18),
    privilegeCount: 30,
    currentApprover: "Dr. Abdullah Hassan",
    currentApproverAr: "د. عبدالله حسن",
  },
  {
    id: "REQ-2024-003",
    type: "expansion",
    status: "in_review",
    submittedDate: new Date(2024, 2, 5),
    createdDate: new Date(2024, 2, 1),
    privilegeCount: 15,
    currentApprover: "Department Head",
    currentApproverAr: "رئيس القسم",
  },
  {
    id: "REQ-2024-004",
    type: "temporary",
    status: "rejected",
    submittedDate: new Date(2024, 2, 10),
    createdDate: new Date(2024, 2, 8),
    privilegeCount: 10,
  },
  {
    id: "REQ-2024-005",
    type: "initial",
    status: "draft",
    submittedDate: null,
    createdDate: new Date(2024, 2, 15),
    privilegeCount: 20,
  },
];

const statusVariants: Record<RequestStatus, "default" | "secondary" | "success" | "warning" | "error"> = {
  draft: "secondary",
  pending: "warning",
  in_review: "default",
  approved: "success",
  rejected: "error",
  cancelled: "secondary",
};

export default function RequestsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const isRTL = locale === "ar";

  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [typeFilter, setTypeFilter] = React.useState<string>("all");

  const filteredRequests = React.useMemo(() => {
    return mockRequests.filter((request) => {
      if (statusFilter !== "all" && request.status !== statusFilter) return false;
      if (typeFilter !== "all" && request.type !== typeFilter) return false;
      return true;
    });
  }, [statusFilter, typeFilter]);

  const getTypeLabel = (type: RequestType) => {
    const labels: Record<RequestType, { en: string; ar: string }> = {
      initial: { en: "Initial", ar: "أولي" },
      renewal: { en: "Renewal", ar: "تجديد" },
      expansion: { en: "Expansion", ar: "توسيع" },
      temporary: { en: "Temporary", ar: "مؤقت" },
    };
    return isRTL ? labels[type].ar : labels[type].en;
  };

  const getStatusLabel = (status: RequestStatus) => {
    return t(`common.status.${status}`);
  };

  const columns: Column<PrivilegeRequest>[] = [
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
      key: "status",
      header: "Status",
      headerAr: "الحالة",
      cell: (item) => (
        <Badge variant={statusVariants[item.status]}>
          {getStatusLabel(item.status)}
        </Badge>
      ),
    },
    {
      key: "privilegeCount",
      header: "Privileges",
      headerAr: "الامتيازات",
      cell: (item) => (
        <span className="text-neutral-600 dark:text-neutral-400">
          {item.privilegeCount} {isRTL ? "امتياز" : "privileges"}
        </span>
      ),
    },
    {
      key: "submittedDate",
      header: "Submitted",
      headerAr: "تاريخ الإرسال",
      cell: (item) => (
        <span className="text-neutral-600 dark:text-neutral-400">
          {item.submittedDate ? formatDate(item.submittedDate, locale) : "-"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      headerAr: "الإجراءات",
      cell: (item) => (
        <div className="flex items-center gap-2">
          <Link href={`/${locale}/requests/${item.id}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          {item.status === "draft" && (
            <>
              <Link href={`/${locale}/requests/${item.id}/edit`}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Pencil className="h-4 w-4" />
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-error-600 hover:text-error-700"
                onClick={(e) => {
                  e.stopPropagation();
                  // TODO: Handle delete
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            {t("common.navigation.requests")}
          </h1>
          <p className="mt-1 text-neutral-500 dark:text-neutral-400">
            {isRTL ? "عرض وإدارة طلبات الامتيازات الخاصة بك" : "View and manage your privilege requests"}
          </p>
        </div>
        <Link href={`/${locale}/requests/new`}>
          <Button>
            <Plus className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
            {t("request.newRequest")}
          </Button>
        </Link>
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
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-40"
        >
          <option value="all">{isRTL ? "كل الحالات" : "All Status"}</option>
          <option value="draft">{t("common.status.draft")}</option>
          <option value="pending">{t("common.status.pending")}</option>
          <option value="in_review">{t("common.status.in_review")}</option>
          <option value="approved">{t("common.status.approved")}</option>
          <option value="rejected">{t("common.status.rejected")}</option>
        </Select>
        <Select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="w-40"
        >
          <option value="all">{isRTL ? "كل الأنواع" : "All Types"}</option>
          <option value="initial">{isRTL ? "أولي" : "Initial"}</option>
          <option value="renewal">{isRTL ? "تجديد" : "Renewal"}</option>
          <option value="expansion">{isRTL ? "توسيع" : "Expansion"}</option>
          <option value="temporary">{isRTL ? "مؤقت" : "Temporary"}</option>
        </Select>
        {(statusFilter !== "all" || typeFilter !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatusFilter("all");
              setTypeFilter("all");
            }}
          >
            {t("common.actions.reset")}
          </Button>
        )}
      </div>

      {/* Requests Table */}
      <DataTable
        data={filteredRequests}
        columns={columns}
        searchPlaceholder={isRTL ? "البحث عن طلب..." : "Search requests..."}
        searchKey="id"
        emptyMessage={
          statusFilter !== "all" || typeFilter !== "all"
            ? isRTL
              ? "لا توجد طلبات تطابق التصفية"
              : "No requests match your filters"
            : isRTL
            ? "لم تقم بإنشاء أي طلبات بعد"
            : "You haven't created any requests yet"
        }
        emptyAction={{
          label: t("request.newRequest"),
          onClick: () => router.push(`/${locale}/requests/new`),
        }}
        onRowClick={(item) => router.push(`/${locale}/requests/${item.id}`)}
      />
    </div>
  );
}
