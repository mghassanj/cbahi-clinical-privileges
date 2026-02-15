"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { DataTable, Column } from "@/components/dashboard/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";
import {
  Plus,
  Eye,
  Pencil,
  Trash2,
  Filter,
} from "lucide-react";

type RequestStatus = "DRAFT" | "PENDING" | "IN_REVIEW" | "APPROVED" | "REJECTED" | "CANCELLED";
type RequestType = "NEW" | "RENEWAL" | "EXPANSION" | "TEMPORARY";

interface PrivilegeRequest {
  id: string;
  type: RequestType;
  status: RequestStatus;
  submittedAt: string | null;
  createdAt: string;
  requestedPrivileges: Array<{ privilege: { id: string } }>;
  applicant: {
    nameEn: string;
    nameAr: string;
  };
}

const statusVariants: Record<string, "default" | "secondary" | "success" | "warning" | "error"> = {
  DRAFT: "secondary",
  PENDING: "warning",
  IN_REVIEW: "default",
  APPROVED: "success",
  REJECTED: "error",
  CANCELLED: "secondary",
};

export default function RequestsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();

  const [isLoading, setIsLoading] = React.useState(true);
  const [requests, setRequests] = React.useState<PrivilegeRequest[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [typeFilter, setTypeFilter] = React.useState<string>("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [requestToDelete, setRequestToDelete] = React.useState<string | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Fetch requests from API
  React.useEffect(() => {
    async function fetchRequests() {
      try {
        setIsLoading(true);
        const params = new URLSearchParams();
        if (statusFilter !== "all") params.append("status", statusFilter);

        const response = await fetch(`/api/requests?${params.toString()}`);

        if (!response.ok) {
          throw new Error("Failed to fetch requests");
        }

        const result = await response.json();
        setRequests(result.data || []);
      } catch (err) {
        console.error("Error fetching requests:", err);
        setError("Failed to load requests");
      } finally {
        setIsLoading(false);
      }
    }

    fetchRequests();
  }, [statusFilter]);

  // Handle delete request
  const handleDeleteRequest = async () => {
    if (!requestToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/requests/${requestToDelete}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || "Failed to delete request");
      }

      // Remove from local state
      setRequests((prev) => prev.filter((r) => r.id !== requestToDelete));
      toast.success(t("request.deleteSuccess"));
    } catch (err) {
      console.error("Error deleting request:", err);
      toast.error(
        err instanceof Error
          ? err.message
          : t("request.deleteError")
      );
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setRequestToDelete(null);
    }
  };

  const filteredRequests = React.useMemo(() => {
    return requests.filter((request) => {
      if (typeFilter !== "all" && request.type !== typeFilter) return false;
      return true;
    });
  }, [requests, typeFilter]);

  const getTypeLabel = (type: RequestType) => {
    return t(`request.types.${type}`);
  };

  const getStatusLabel = (status: RequestStatus) => {
    return t(`request.statuses.${status}`);
  };

  const columns: Column<PrivilegeRequest>[] = [
    {
      key: "id",
      header: "Request ID",
      headerAr: "رقم الطلب",
      cell: (item) => (
        <span className="font-medium text-primary-600 dark:text-primary-400">
          {item.id.slice(0, 8)}...
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
        <Badge variant={statusVariants[item.status] || "secondary"}>
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
          {item.requestedPrivileges?.length || 0} {t("request.privileges")}
        </span>
      ),
    },
    {
      key: "submittedAt",
      header: "Submitted",
      headerAr: "تاريخ الإرسال",
      cell: (item) => (
        <span className="text-neutral-600 dark:text-neutral-400">
          {item.submittedAt ? formatDate(new Date(item.submittedAt), locale) : "-"}
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
          {item.status === "DRAFT" && (
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
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  setRequestToDelete(item.id);
                  setDeleteDialogOpen(true);
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

  if (isLoading) {
    return <RequestsPageSkeleton />;
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
            {t("common.navigation.requests")}
          </h1>
          <p className="mt-1 text-neutral-500 dark:text-neutral-400">
            {t("request.description")}
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
          <option value="all">{t("request.filters.allStatus")}</option>
          <option value="DRAFT">{t("request.statuses.DRAFT")}</option>
          <option value="PENDING">{t("request.statuses.PENDING")}</option>
          <option value="IN_REVIEW">{t("request.statuses.IN_REVIEW")}</option>
          <option value="APPROVED">{t("request.statuses.APPROVED")}</option>
          <option value="REJECTED">{t("request.statuses.REJECTED")}</option>
        </Select>
        <Select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="w-40"
        >
          <option value="all">{t("request.filters.allTypes")}</option>
          <option value="NEW">{t("request.types.NEW")}</option>
          <option value="RENEWAL">{t("request.types.RENEWAL")}</option>
          <option value="EXPANSION">{t("request.types.EXPANSION")}</option>
          <option value="TEMPORARY">{t("request.types.TEMPORARY")}</option>
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
        searchPlaceholder={t("request.searchPlaceholder")}
        searchKey="id"
        emptyMessage={
          statusFilter !== "all" || typeFilter !== "all"
            ? t("request.noMatchingRequests")
            : t("request.noRequests")
        }
        emptyAction={{
          label: t("request.newRequest"),
          onClick: () => router.push(`/${locale}/requests/new`),
        }}
        onRowClick={(item) => router.push(`/${locale}/requests/${item.id}`)}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogClose />
          <DialogHeader>
            <DialogTitle>
              {t("request.deleteTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("request.deleteDescription")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              {t("common.actions.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteRequest}
              isLoading={isDeleting}
            >
              {t("common.actions.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RequestsPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-40" />
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}
