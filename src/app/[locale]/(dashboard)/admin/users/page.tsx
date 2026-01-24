"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { DataTable, Column } from "@/components/dashboard/data-table";
import {
  LiquidGlassCard,
  LiquidGlassCardContent,
} from "@/components/custom/liquid-glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Filter,
  UserCog,
  Shield,
  CheckCircle,
  XCircle,
  MapPin,
  FileText,
} from "lucide-react";

type UserRole = "EMPLOYEE" | "HEAD_OF_SECTION" | "HEAD_OF_DEPT" | "COMMITTEE_MEMBER" | "MEDICAL_DIRECTOR" | "ADMIN";
type UserStatus = "ACTIVE" | "INACTIVE" | "PENDING";

interface User {
  id: string;
  nameEn: string;
  nameAr: string | null;
  email: string;
  departmentEn: string | null;
  departmentAr: string | null;
  // Location fields from Jisr
  locationId: number | null;
  locationEn: string | null;
  locationAr: string | null;
  branchId: number | null;
  branchEn: string | null;
  branchAr: string | null;
  // Document fields from Jisr
  documentType: string | null;
  nationalIdNumber: string | null;
  iqamaNumber: string | null;
  passportNumber: string | null;
  // Photo from Jisr
  photoUrl: string | null;
  role: UserRole;
  status: UserStatus;
  isActive: boolean;
  lastSyncedAt: string | null;
  createdAt: string;
  _count: {
    privilegeRequests: number;
    approvals: number;
  };
}

export default function UsersPage() {
  const t = useTranslations();
  const locale = useLocale();
  const isRTL = locale === "ar";

  const [isLoading, setIsLoading] = React.useState(true);
  const [users, setUsers] = React.useState<User[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [totalUsers, setTotalUsers] = React.useState(0);
  const [roleFilter, setRoleFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = React.useState<string>("all");
  const [locationFilter, setLocationFilter] = React.useState<string>("all");
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null);
  const [showRoleModal, setShowRoleModal] = React.useState(false);

  // Fetch users from API
  React.useEffect(() => {
    async function fetchUsers() {
      try {
        setIsLoading(true);
        const params = new URLSearchParams();
        if (roleFilter !== "all") params.append("role", roleFilter);
        if (statusFilter !== "all") params.append("status", statusFilter);
        params.append("limit", "100");

        const response = await fetch(`/api/users?${params.toString()}`);

        if (!response.ok) {
          throw new Error("Failed to fetch users");
        }

        const result = await response.json();
        setUsers(result.data || []);
        setTotalUsers(result.statistics?.total || result.data?.length || 0);
      } catch (err) {
        console.error("Error fetching users:", err);
        setError("Failed to load users");
      } finally {
        setIsLoading(false);
      }
    }

    fetchUsers();
  }, [roleFilter, statusFilter]);

  const filteredUsers = React.useMemo(() => {
    return users.filter((user) => {
      if (departmentFilter !== "all" && user.departmentEn !== departmentFilter) return false;
      if (locationFilter !== "all" && user.locationEn !== locationFilter) return false;
      return true;
    });
  }, [users, departmentFilter, locationFilter]);

  const departments = Array.from(new Set(users.map((u) => u.departmentEn).filter(Boolean)));
  const locations = Array.from(new Set(users.map((u) => u.locationEn).filter(Boolean)));

  const getRoleLabel = (role: UserRole) => {
    return t(`admin.userManagement.roles.${role}`);
  };

  const getRoleBadgeVariant = (role: UserRole) => {
    const variants: Record<UserRole, "default" | "secondary" | "warning"> = {
      ADMIN: "default",
      MEDICAL_DIRECTOR: "default",
      HEAD_OF_DEPT: "warning",
      HEAD_OF_SECTION: "warning",
      COMMITTEE_MEMBER: "warning",
      EMPLOYEE: "secondary",
    };
    return variants[role] || "secondary";
  };

  const getStatusLabel = (status: UserStatus, isActive: boolean) => {
    if (!isActive) return t("admin.userManagement.status.INACTIVE");
    return t(`admin.userManagement.status.${status}`);
  };

  const getStatusBadgeVariant = (status: UserStatus, isActive: boolean) => {
    if (!isActive) return "secondary";
    const variants: Record<UserStatus, "success" | "secondary" | "warning"> = {
      ACTIVE: "success",
      INACTIVE: "secondary",
      PENDING: "warning",
    };
    return variants[status] || "secondary";
  };

  const formatLastSync = (date: string | null) => {
    if (!date) return t("admin.userManagement.neverSynced");
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 1000 / 60);
    if (minutes < 60) return t("admin.userManagement.timeAgo.minutes", { count: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t("admin.userManagement.timeAgo.hours", { count: hours });
    const days = Math.floor(hours / 24);
    return t("admin.userManagement.timeAgo.days", { count: days });
  };

  const getDocumentNumber = (user: User) => {
    // Return the most relevant document number available
    if (user.nationalIdNumber) return user.nationalIdNumber;
    if (user.iqamaNumber) return user.iqamaNumber;
    if (user.passportNumber) return user.passportNumber;
    return null;
  };

  const getLocationDisplay = (user: User) => {
    // Prefer branch if available, otherwise use location
    const branch = isRTL ? user.branchAr || user.branchEn : user.branchEn;
    const location = isRTL ? user.locationAr || user.locationEn : user.locationEn;
    return branch || location || null;
  };

  const handleAssignRole = (user: User) => {
    setSelectedUser(user);
    setShowRoleModal(true);
  };

  const columns: Column<User>[] = [
    {
      key: "user",
      header: "User",
      headerAr: "المستخدم",
      cell: (item) => (
        <div className="flex items-center gap-3">
          <Avatar
            name={item.nameEn}
            src={item.photoUrl}
            size="sm"
          />
          <div>
            <p className="font-medium text-neutral-900 dark:text-white">
              {isRTL ? item.nameAr || item.nameEn : item.nameEn}
            </p>
            <p className="text-sm text-neutral-500">{item.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "department",
      header: "Department",
      headerAr: "القسم",
      cell: (item) => (
        <div>
          <span className="text-neutral-600 dark:text-neutral-400">
            {isRTL ? item.departmentAr || item.departmentEn : item.departmentEn || "-"}
          </span>
          {getLocationDisplay(item) && (
            <div className="flex items-center gap-1 mt-0.5 text-xs text-neutral-400">
              <MapPin className="h-3 w-3" />
              <span>{getLocationDisplay(item)}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: "documentNumber",
      header: "Document No.",
      headerAr: "رقم الهوية",
      cell: (item) => {
        const docNumber = getDocumentNumber(item);
        return docNumber ? (
          <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400">
            <FileText className="h-3.5 w-3.5 text-neutral-400" />
            <span className="text-sm font-mono">{docNumber}</span>
          </div>
        ) : (
          <span className="text-neutral-400">-</span>
        );
      },
    },
    {
      key: "role",
      header: "Role",
      headerAr: "الدور",
      cell: (item) => (
        <Badge variant={getRoleBadgeVariant(item.role)}>
          <Shield className="mr-1 h-3 w-3 rtl:ml-1 rtl:mr-0" />
          {getRoleLabel(item.role)}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      headerAr: "الحالة",
      cell: (item) => (
        <Badge variant={getStatusBadgeVariant(item.status, item.isActive)}>
          {item.isActive ? (
            <CheckCircle className="mr-1 h-3 w-3 rtl:ml-1 rtl:mr-0" />
          ) : (
            <XCircle className="mr-1 h-3 w-3 rtl:ml-1 rtl:mr-0" />
          )}
          {getStatusLabel(item.status, item.isActive)}
        </Badge>
      ),
    },
    {
      key: "lastSync",
      header: "Last Sync",
      headerAr: "آخر مزامنة",
      cell: (item) => (
        <span className="text-sm text-neutral-500">
          {formatLastSync(item.lastSyncedAt)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      headerAr: "الإجراءات",
      cell: (item) => (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleAssignRole(item);
            }}
          >
            <UserCog className="mr-1 h-4 w-4 rtl:ml-1 rtl:mr-0" />
            {t("admin.userManagement.assignRole")}
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return <UsersPageSkeleton />;
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
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
          {t("admin.userManagement.title")}
        </h1>
        <p className="mt-1 text-neutral-500 dark:text-neutral-400">
          {t("admin.userManagement.description", { count: totalUsers })}
        </p>
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
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="w-40"
        >
          <option value="all">{t("admin.userManagement.filters.allRoles")}</option>
          <option value="ADMIN">{t("admin.userManagement.roles.ADMIN")}</option>
          <option value="MEDICAL_DIRECTOR">{t("admin.userManagement.roles.MEDICAL_DIRECTOR")}</option>
          <option value="HEAD_OF_DEPT">{t("admin.userManagement.roles.HEAD_OF_DEPT")}</option>
          <option value="HEAD_OF_SECTION">{t("admin.userManagement.roles.HEAD_OF_SECTION")}</option>
          <option value="COMMITTEE_MEMBER">{t("admin.userManagement.roles.COMMITTEE_MEMBER")}</option>
          <option value="EMPLOYEE">{t("admin.userManagement.roles.EMPLOYEE")}</option>
        </Select>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-36"
        >
          <option value="all">{t("admin.userManagement.filters.allStatus")}</option>
          <option value="ACTIVE">{t("admin.userManagement.status.ACTIVE")}</option>
          <option value="INACTIVE">{t("admin.userManagement.status.INACTIVE")}</option>
          <option value="PENDING">{t("admin.userManagement.status.PENDING")}</option>
        </Select>
        <Select
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          className="w-44"
        >
          <option value="all">{t("admin.userManagement.filters.allDepartments")}</option>
          {departments.map((dept) => (
            <option key={dept} value={dept || ""}>
              {dept}
            </option>
          ))}
        </Select>
        <Select
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          className="w-44"
        >
          <option value="all">{t("admin.userManagement.filters.allLocations")}</option>
          {locations.map((loc) => (
            <option key={loc} value={loc || ""}>
              {loc}
            </option>
          ))}
        </Select>
        {(roleFilter !== "all" || statusFilter !== "all" || departmentFilter !== "all" || locationFilter !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setRoleFilter("all");
              setStatusFilter("all");
              setDepartmentFilter("all");
              setLocationFilter("all");
            }}
          >
            {t("common.actions.reset")}
          </Button>
        )}
      </div>

      {/* Users Table */}
      <DataTable
        data={filteredUsers}
        columns={columns}
        searchPlaceholder={t("admin.userManagement.searchPlaceholder")}
        searchKey="nameEn"
        emptyMessage={t("admin.userManagement.noUsers")}
      />

      {/* Role Assignment Modal */}
      {showRoleModal && selectedUser && (
        <RoleAssignmentModal
          user={selectedUser}
          onClose={() => {
            setShowRoleModal(false);
            setSelectedUser(null);
          }}
          onSave={(userId, newRole) => {
            setUsers((prev) =>
              prev.map((u) =>
                u.id === userId ? { ...u, role: newRole as UserRole } : u
              )
            );
          }}
        />
      )}
    </div>
  );
}

function RoleAssignmentModal({
  user,
  onClose,
  onSave,
}: {
  user: User;
  onClose: () => void;
  onSave: (userId: string, role: string) => void;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const isRTL = locale === "ar";

  const [selectedRole, setSelectedRole] = React.useState<UserRole>(user.role);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, role: selectedRole }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to update role");
      }

      onSave(user.id, selectedRole);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <LiquidGlassCard className="w-full max-w-md">
        <LiquidGlassCardContent className="p-6">
          <h2 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-white">
            {t("admin.userManagement.assignRole")}
          </h2>

          <div className="mb-4">
            <div className="flex items-center gap-3">
              <Avatar name={user.nameEn} src={user.photoUrl} size="md" />
              <div>
                <p className="font-medium text-neutral-900 dark:text-white">
                  {isRTL ? user.nameAr || user.nameEn : user.nameEn}
                </p>
                <p className="text-sm text-neutral-500">{user.email}</p>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-error-50 p-3 text-sm text-error-700 dark:bg-error-900/20 dark:text-error-400">
              {error}
            </div>
          )}

          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {t("admin.userManagement.roleLabel")}
            </label>
            <Select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as UserRole)}
              className="w-full"
            >
              <option value="EMPLOYEE">{t("admin.userManagement.roles.EMPLOYEE")}</option>
              <option value="HEAD_OF_SECTION">{t("admin.userManagement.roles.HEAD_OF_SECTION")}</option>
              <option value="HEAD_OF_DEPT">{t("admin.userManagement.roles.HEAD_OF_DEPT")}</option>
              <option value="COMMITTEE_MEMBER">{t("admin.userManagement.roles.COMMITTEE_MEMBER")}</option>
              <option value="MEDICAL_DIRECTOR">{t("admin.userManagement.roles.MEDICAL_DIRECTOR")}</option>
              <option value="ADMIN">{t("admin.userManagement.roles.ADMIN")}</option>
            </Select>
            <p className="mt-2 text-sm text-neutral-500">
              {selectedRole === "ADMIN"
                ? t("admin.userManagement.roleDescriptions.ADMIN")
                : selectedRole === "MEDICAL_DIRECTOR"
                ? t("admin.userManagement.roleDescriptions.MEDICAL_DIRECTOR")
                : ["HEAD_OF_DEPT", "HEAD_OF_SECTION", "COMMITTEE_MEMBER"].includes(selectedRole)
                ? t("admin.userManagement.roleDescriptions.APPROVER")
                : t("admin.userManagement.roleDescriptions.EMPLOYEE")}
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              {t("common.actions.cancel")}
            </Button>
            <Button onClick={handleSave} isLoading={isSaving}>
              {t("common.actions.save")}
            </Button>
          </div>
        </LiquidGlassCardContent>
      </LiquidGlassCard>
    </div>
  );
}

function UsersPageSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-10 w-36" />
        <Skeleton className="h-10 w-36" />
        <Skeleton className="h-10 w-44" />
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}
