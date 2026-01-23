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
import {
  Filter,
  UserCog,
  Shield,
  CheckCircle,
  XCircle,
} from "lucide-react";

type UserRole = "employee" | "approver" | "admin";
type UserStatus = "active" | "inactive" | "pending";

interface User {
  id: string;
  name: string;
  nameAr: string;
  email: string;
  department: string;
  departmentAr: string;
  role: UserRole;
  status: UserStatus;
  lastLogin: Date | null;
  createdAt: Date;
  avatar?: string;
}

// Mock data
const mockUsers: User[] = [
  {
    id: "1",
    name: "Dr. Ahmed Al-Rashid",
    nameAr: "د. أحمد الراشد",
    email: "ahmed.rashid@hospital.com",
    department: "Dental Department",
    departmentAr: "قسم طب الأسنان",
    role: "admin",
    status: "active",
    lastLogin: new Date(Date.now() - 1000 * 60 * 30),
    createdAt: new Date(2023, 0, 15),
  },
  {
    id: "2",
    name: "Dr. Sara Ahmed",
    nameAr: "د. سارة أحمد",
    email: "sara.ahmed@hospital.com",
    department: "Orthodontics",
    departmentAr: "تقويم الأسنان",
    role: "approver",
    status: "active",
    lastLogin: new Date(Date.now() - 1000 * 60 * 60 * 2),
    createdAt: new Date(2023, 2, 10),
  },
  {
    id: "3",
    name: "Dr. Mohammed Ali",
    nameAr: "د. محمد علي",
    email: "mohammed.ali@hospital.com",
    department: "Oral Surgery",
    departmentAr: "جراحة الفم",
    role: "employee",
    status: "active",
    lastLogin: new Date(Date.now() - 1000 * 60 * 60 * 24),
    createdAt: new Date(2023, 5, 20),
  },
  {
    id: "4",
    name: "Dr. Fatima Hassan",
    nameAr: "د. فاطمة حسن",
    email: "fatima.hassan@hospital.com",
    department: "Periodontics",
    departmentAr: "علاج اللثة",
    role: "approver",
    status: "active",
    lastLogin: new Date(Date.now() - 1000 * 60 * 60 * 48),
    createdAt: new Date(2023, 3, 5),
  },
  {
    id: "5",
    name: "Dr. Abdullah Hassan",
    nameAr: "د. عبدالله حسن",
    email: "abdullah.hassan@hospital.com",
    department: "Dental Department",
    departmentAr: "قسم طب الأسنان",
    role: "approver",
    status: "inactive",
    lastLogin: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
    createdAt: new Date(2022, 8, 12),
  },
  {
    id: "6",
    name: "Dr. Noura Al-Rashid",
    nameAr: "د. نورة الراشد",
    email: "noura.rashid@hospital.com",
    department: "Prosthodontics",
    departmentAr: "الاستعاضة السنية",
    role: "employee",
    status: "pending",
    lastLogin: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
  },
];

export default function UsersPage() {
  const t = useTranslations();
  const locale = useLocale();
  const isRTL = locale === "ar";

  const [roleFilter, setRoleFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = React.useState<string>("all");
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null);
  const [showRoleModal, setShowRoleModal] = React.useState(false);

  const filteredUsers = React.useMemo(() => {
    return mockUsers.filter((user) => {
      if (roleFilter !== "all" && user.role !== roleFilter) return false;
      if (statusFilter !== "all" && user.status !== statusFilter) return false;
      if (departmentFilter !== "all" && user.department !== departmentFilter) return false;
      return true;
    });
  }, [roleFilter, statusFilter, departmentFilter]);

  const departments = Array.from(new Set(mockUsers.map((u) => u.department)));

  const getRoleLabel = (role: UserRole) => {
    const labels: Record<UserRole, { en: string; ar: string }> = {
      employee: { en: "Employee", ar: "موظف" },
      approver: { en: "Approver", ar: "معتمد" },
      admin: { en: "Administrator", ar: "مسؤول" },
    };
    return isRTL ? labels[role].ar : labels[role].en;
  };

  const getRoleBadgeVariant = (role: UserRole) => {
    const variants: Record<UserRole, "default" | "secondary" | "warning"> = {
      admin: "default",
      approver: "warning",
      employee: "secondary",
    };
    return variants[role];
  };

  const getStatusLabel = (status: UserStatus) => {
    const labels: Record<UserStatus, { en: string; ar: string }> = {
      active: { en: "Active", ar: "نشط" },
      inactive: { en: "Inactive", ar: "غير نشط" },
      pending: { en: "Pending", ar: "معلق" },
    };
    return isRTL ? labels[status].ar : labels[status].en;
  };

  const getStatusBadgeVariant = (status: UserStatus) => {
    const variants: Record<UserStatus, "success" | "secondary" | "warning"> = {
      active: "success",
      inactive: "secondary",
      pending: "warning",
    };
    return variants[status];
  };

  const formatLastLogin = (date: Date | null) => {
    if (!date) return isRTL ? "لم يسجل دخول بعد" : "Never logged in";
    const diff = Date.now() - date.getTime();
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
          <Avatar name={item.name} src={item.avatar} size="sm" />
          <div>
            <p className="font-medium text-neutral-900 dark:text-white">
              {isRTL ? item.nameAr : item.name}
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
          {isRTL ? item.departmentAr : item.department}
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
        <Badge variant={getStatusBadgeVariant(item.status)}>
          {item.status === "active" ? (
            <CheckCircle className="mr-1 h-3 w-3 rtl:ml-1 rtl:mr-0" />
          ) : (
            <XCircle className="mr-1 h-3 w-3 rtl:ml-1 rtl:mr-0" />
          )}
          {getStatusLabel(item.status)}
        </Badge>
      ),
    },
    {
      key: "lastLogin",
      header: "Last Login",
      headerAr: "آخر دخول",
      cell: (item) => (
        <span className="text-sm text-neutral-500">
          {formatLastLogin(item.lastLogin)}
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
          {t("admin.userManagement.title")}
        </h1>
        <p className="mt-1 text-neutral-500 dark:text-neutral-400">
          {isRTL
            ? `إدارة ${mockUsers.length} مستخدم مسجل في النظام`
            : `Manage ${mockUsers.length} users registered in the system`}
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
          className="w-36"
        >
          <option value="all">{isRTL ? "كل الأدوار" : "All Roles"}</option>
          <option value="admin">{isRTL ? "مسؤول" : "Administrator"}</option>
          <option value="approver">{isRTL ? "معتمد" : "Approver"}</option>
          <option value="employee">{isRTL ? "موظف" : "Employee"}</option>
        </Select>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-36"
        >
          <option value="all">{isRTL ? "كل الحالات" : "All Status"}</option>
          <option value="active">{isRTL ? "نشط" : "Active"}</option>
          <option value="inactive">{isRTL ? "غير نشط" : "Inactive"}</option>
          <option value="pending">{isRTL ? "معلق" : "Pending"}</option>
        </Select>
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
        searchKey="name"
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
        />
      )}
    </div>
  );
}

function RoleAssignmentModal({
  user,
  onClose,
}: {
  user: User;
  onClose: () => void;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const isRTL = locale === "ar";

  const [selectedRole, setSelectedRole] = React.useState<UserRole>(user.role);
  const [isSaving, setIsSaving] = React.useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    // TODO: API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
    onClose();
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
              <Avatar name={user.name} size="md" />
              <div>
                <p className="font-medium text-neutral-900 dark:text-white">
                  {isRTL ? user.nameAr : user.name}
                </p>
                <p className="text-sm text-neutral-500">{user.email}</p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {isRTL ? "الدور" : "Role"}
            </label>
            <Select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as UserRole)}
              className="w-full"
            >
              <option value="employee">{isRTL ? "موظف" : "Employee"}</option>
              <option value="approver">{isRTL ? "معتمد" : "Approver"}</option>
              <option value="admin">{isRTL ? "مسؤول" : "Administrator"}</option>
            </Select>
            <p className="mt-2 text-sm text-neutral-500">
              {selectedRole === "admin"
                ? isRTL
                  ? "المسؤولون لديهم صلاحية كاملة لإدارة النظام"
                  : "Administrators have full system management access"
                : selectedRole === "approver"
                ? isRTL
                  ? "المعتمدون يمكنهم مراجعة والموافقة على طلبات الامتيازات"
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
