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
      return true;
    });
  }, [users, departmentFilter]);

  const departments = Array.from(new Set(users.map((u) => u.departmentEn).filter(Boolean)));

  const getRoleLabel = (role: UserRole) => {
    const labels: Record<UserRole, { en: string; ar: string }> = {
      EMPLOYEE: { en: "Employee", ar: "موظف" },
      HEAD_OF_SECTION: { en: "Head of Section", ar: "رئيس قسم" },
      HEAD_OF_DEPT: { en: "Head of Department", ar: "رئيس إدارة" },
      COMMITTEE_MEMBER: { en: "Committee Member", ar: "عضو لجنة" },
      MEDICAL_DIRECTOR: { en: "Medical Director", ar: "المدير الطبي" },
      ADMIN: { en: "Administrator", ar: "مسؤول" },
    };
    return isRTL ? labels[role]?.ar || role : labels[role]?.en || role;
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
    if (!isActive) return isRTL ? "غير نشط" : "Inactive";
    const labels: Record<UserStatus, { en: string; ar: string }> = {
      ACTIVE: { en: "Active", ar: "نشط" },
      INACTIVE: { en: "Inactive", ar: "غير نشط" },
      PENDING: { en: "Pending", ar: "معلق" },
    };
    return isRTL ? labels[status]?.ar || status : labels[status]?.en || status;
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
    if (!date) return isRTL ? "لم تتم المزامنة" : "Never synced";
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 1000 / 60);
    if (minutes < 60) return isRTL ? `منذ ${minutes} دقيقة` : `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return isRTL ? `منذ ${hours} ساعة` : `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    return isRTL ? `منذ ${days} يوم` : `${days} days ago`;
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
          <Avatar name={item.nameEn} size="sm" />
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
        <span className="text-neutral-600 dark:text-neutral-400">
          {isRTL ? item.departmentAr || item.departmentEn : item.departmentEn || "-"}
        </span>
      ),
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
          {isRTL
            ? `إدارة ${totalUsers} مستخدم مسجل في النظام`
            : `Manage ${totalUsers} users registered in the system`}
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
          <option value="all">{isRTL ? "كل الأدوار" : "All Roles"}</option>
          <option value="ADMIN">{isRTL ? "مسؤول" : "Administrator"}</option>
          <option value="MEDICAL_DIRECTOR">{isRTL ? "المدير الطبي" : "Medical Director"}</option>
          <option value="HEAD_OF_DEPT">{isRTL ? "رئيس إدارة" : "Head of Department"}</option>
          <option value="HEAD_OF_SECTION">{isRTL ? "رئيس قسم" : "Head of Section"}</option>
          <option value="COMMITTEE_MEMBER">{isRTL ? "عضو لجنة" : "Committee Member"}</option>
          <option value="EMPLOYEE">{isRTL ? "موظف" : "Employee"}</option>
        </Select>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-36"
        >
          <option value="all">{isRTL ? "كل الحالات" : "All Status"}</option>
          <option value="ACTIVE">{isRTL ? "نشط" : "Active"}</option>
          <option value="INACTIVE">{isRTL ? "غير نشط" : "Inactive"}</option>
          <option value="PENDING">{isRTL ? "معلق" : "Pending"}</option>
        </Select>
        <Select
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          className="w-44"
        >
          <option value="all">{isRTL ? "كل الأقسام" : "All Departments"}</option>
          {departments.map((dept) => (
            <option key={dept} value={dept || ""}>
              {dept}
            </option>
          ))}
        </Select>
        {(roleFilter !== "all" || statusFilter !== "all" || departmentFilter !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setRoleFilter("all");
              setStatusFilter("all");
              setDepartmentFilter("all");
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
        searchPlaceholder={isRTL ? "البحث عن مستخدم..." : "Search users..."}
        searchKey="nameEn"
        emptyMessage={isRTL ? "لا يوجد مستخدمون" : "No users found"}
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
              <Avatar name={user.nameEn} size="md" />
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
              {isRTL ? "الدور" : "Role"}
            </label>
            <Select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as UserRole)}
              className="w-full"
            >
              <option value="EMPLOYEE">{isRTL ? "موظف" : "Employee"}</option>
              <option value="HEAD_OF_SECTION">{isRTL ? "رئيس قسم" : "Head of Section"}</option>
              <option value="HEAD_OF_DEPT">{isRTL ? "رئيس إدارة" : "Head of Department"}</option>
              <option value="COMMITTEE_MEMBER">{isRTL ? "عضو لجنة" : "Committee Member"}</option>
              <option value="MEDICAL_DIRECTOR">{isRTL ? "المدير الطبي" : "Medical Director"}</option>
              <option value="ADMIN">{isRTL ? "مسؤول" : "Administrator"}</option>
            </Select>
            <p className="mt-2 text-sm text-neutral-500">
              {selectedRole === "ADMIN"
                ? isRTL
                  ? "المسؤولون لديهم صلاحية كاملة لإدارة النظام"
                  : "Administrators have full system management access"
                : selectedRole === "MEDICAL_DIRECTOR"
                ? isRTL
                  ? "المدير الطبي لديه صلاحية الموافقة النهائية على الطلبات"
                  : "Medical Directors have final approval authority"
                : ["HEAD_OF_DEPT", "HEAD_OF_SECTION", "COMMITTEE_MEMBER"].includes(selectedRole)
                ? isRTL
                  ? "يمكنهم مراجعة والموافقة على طلبات الامتيازات"
                  : "Approvers can review and approve privilege requests"
                : isRTL
                ? "الموظفون يمكنهم تقديم طلبات الامتيازات"
                : "Employees can submit privilege requests"}
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
