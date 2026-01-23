"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  LiquidGlassCard,
  LiquidGlassCardContent,
  LiquidGlassCardHeader,
  LiquidGlassCardTitle,
} from "@/components/custom/liquid-glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
import {
  Mail,
  Phone,
  Calendar,
  Shield,
  Globe,
  Bell,
  Save,
  CheckCircle,
  Clock,
  XCircle,
  Award,
} from "lucide-react";

interface UserProfile {
  id: string;
  name: string;
  nameAr: string;
  email: string;
  phone: string;
  department: string;
  departmentAr: string;
  jobTitle: string;
  jobTitleAr: string;
  employeeCode: string;
  scfhsNumber: string;
  scfhsExpiry: Date;
  hireDate: Date;
  avatar?: string;
  role: "employee" | "approver" | "admin";
  preferences: {
    language: "en" | "ar";
    emailNotifications: boolean;
    systemNotifications: boolean;
  };
  statistics: {
    totalRequests: number;
    approvedRequests: number;
    rejectedRequests: number;
    pendingRequests: number;
    approvalsGiven?: number;
    approvalsThisMonth?: number;
  };
}

// Mock data
const mockProfile: UserProfile = {
  id: "1",
  name: "Dr. Ahmed Al-Rashid",
  nameAr: "د. أحمد الراشد",
  email: "ahmed.rashid@hospital.com",
  phone: "+966 50 123 4567",
  department: "Dental Department",
  departmentAr: "قسم طب الأسنان",
  jobTitle: "Senior Dentist",
  jobTitleAr: "طبيب أسنان أول",
  employeeCode: "EMP-001",
  scfhsNumber: "SCFHS-12345",
  scfhsExpiry: new Date(2025, 5, 30),
  hireDate: new Date(2018, 2, 15),
  role: "admin",
  preferences: {
    language: "en",
    emailNotifications: true,
    systemNotifications: true,
  },
  statistics: {
    totalRequests: 12,
    approvedRequests: 10,
    rejectedRequests: 1,
    pendingRequests: 1,
    approvalsGiven: 45,
    approvalsThisMonth: 8,
  },
};

export default function ProfilePage() {
  const t = useTranslations();
  const locale = useLocale();
  const isRTL = locale === "ar";

  const [isLoading, setIsLoading] = React.useState(true);
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [editedProfile, setEditedProfile] = React.useState<Partial<UserProfile>>({});
  const [isSaving, setIsSaving] = React.useState(false);
  const [hasChanges, setHasChanges] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setProfile(mockProfile);
      setEditedProfile({
        scfhsNumber: mockProfile.scfhsNumber,
        preferences: { ...mockProfile.preferences },
      });
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    // TODO: API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
    setHasChanges(false);
  };

  const handlePreferenceChange = (
    key: keyof UserProfile["preferences"],
    value: string | boolean
  ) => {
    setEditedProfile((prev) => {
      const currentPrefs = prev.preferences || profile?.preferences || {
        language: "en" as const,
        emailNotifications: true,
        systemNotifications: true,
      };
      return {
        ...prev,
        preferences: {
          ...currentPrefs,
          [key]: value,
        },
      };
    });
    setHasChanges(true);
  };

  const handleScfhsChange = (value: string) => {
    setEditedProfile((prev) => ({
      ...prev,
      scfhsNumber: value,
    }));
    setHasChanges(true);
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, { en: string; ar: string }> = {
      employee: { en: "Employee", ar: "موظف" },
      approver: { en: "Approver", ar: "معتمد" },
      admin: { en: "Administrator", ar: "مسؤول" },
    };
    return isRTL ? labels[role]?.ar : labels[role]?.en;
  };

  if (isLoading) {
    return <ProfileSkeleton />;
  }

  if (!profile) {
    return null;
  }

  const displayName = isRTL ? profile.nameAr : profile.name;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            {t("profile.title")}
          </h1>
          <p className="mt-1 text-neutral-500 dark:text-neutral-400">
            {isRTL ? "عرض وتحديث معلومات ملفك الشخصي" : "View and update your profile information"}
          </p>
        </div>
        {hasChanges && (
          <Button onClick={handleSave} isLoading={isSaving}>
            <Save className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
            {t("common.actions.save")}
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Profile Info */}
        <div className="space-y-6 lg:col-span-2">
          {/* Personal Info Card */}
          <LiquidGlassCard>
            <LiquidGlassCardHeader>
              <LiquidGlassCardTitle>
                {t("profile.personalInfo")}
              </LiquidGlassCardTitle>
            </LiquidGlassCardHeader>
            <LiquidGlassCardContent>
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                <div className="flex flex-col items-center gap-3">
                  <Avatar name={profile.name} src={profile.avatar} size="xl" />
                  <Badge variant="default">{getRoleLabel(profile.role)}</Badge>
                </div>
                <div className="flex-1 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-neutral-500">{t("request.form.personalInfo.fullName")}</p>
                    <p className="font-medium text-neutral-900 dark:text-white">
                      {displayName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500">{t("request.form.personalInfo.employeeCode")}</p>
                    <p className="font-medium text-neutral-900 dark:text-white">
                      {profile.employeeCode}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500">{t("request.form.personalInfo.department")}</p>
                    <p className="font-medium text-neutral-900 dark:text-white">
                      {isRTL ? profile.departmentAr : profile.department}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500">{t("request.form.personalInfo.jobTitle")}</p>
                    <p className="font-medium text-neutral-900 dark:text-white">
                      {isRTL ? profile.jobTitleAr : profile.jobTitle}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 border-t border-neutral-200 pt-6 dark:border-neutral-800">
                <h4 className="mb-4 font-medium text-neutral-900 dark:text-white">
                  {t("profile.contactInfo")}
                </h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-neutral-400" />
                    <div>
                      <p className="text-sm text-neutral-500">{t("request.form.personalInfo.email")}</p>
                      <p className="font-medium">{profile.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-neutral-400" />
                    <div>
                      <p className="text-sm text-neutral-500">{t("request.form.personalInfo.phone")}</p>
                      <p className="font-medium" dir="ltr">{profile.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-neutral-400" />
                    <div>
                      <p className="text-sm text-neutral-500">{isRTL ? "تاريخ التعيين" : "Hire Date"}</p>
                      <p className="font-medium">{formatDate(profile.hireDate, locale)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-lg bg-neutral-50 p-4 dark:bg-neutral-800/50">
                <p className="text-sm text-neutral-500">
                  {isRTL
                    ? "المعلومات الشخصية يتم مزامنتها من نظام جسر للموارد البشرية. لتحديث هذه المعلومات، يرجى التواصل مع قسم الموارد البشرية."
                    : "Personal information is synced from Jisr HR system. To update this information, please contact HR department."}
                </p>
              </div>
            </LiquidGlassCardContent>
          </LiquidGlassCard>

          {/* Credentials Card */}
          <LiquidGlassCard>
            <LiquidGlassCardHeader>
              <LiquidGlassCardTitle>
                {t("profile.credentials")}
              </LiquidGlassCardTitle>
            </LiquidGlassCardHeader>
            <LiquidGlassCardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    {t("request.form.personalInfo.scfhsNumber")}
                  </label>
                  <Input
                    value={editedProfile.scfhsNumber || profile.scfhsNumber}
                    onChange={(e) => handleScfhsChange(e.target.value)}
                    placeholder="SCFHS-XXXXX"
                    icon={<Shield className="h-4 w-4" />}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    {t("request.form.personalInfo.scfhsExpiry")}
                  </label>
                  <div className="flex h-10 items-center gap-2 rounded-lg border border-neutral-300 bg-neutral-50 px-3 dark:border-neutral-700 dark:bg-neutral-800">
                    <Calendar className="h-4 w-4 text-neutral-400" />
                    <span className="text-neutral-700 dark:text-neutral-300">
                      {formatDate(profile.scfhsExpiry, locale)}
                    </span>
                    {new Date() > new Date(profile.scfhsExpiry.getTime() - 30 * 24 * 60 * 60 * 1000) && (
                      <Badge variant="warning" className="ml-auto">
                        {isRTL ? "ينتهي قريباً" : "Expiring Soon"}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </LiquidGlassCardContent>
          </LiquidGlassCard>

          {/* Preferences Card */}
          <LiquidGlassCard>
            <LiquidGlassCardHeader>
              <LiquidGlassCardTitle>
                {t("profile.preferences")}
              </LiquidGlassCardTitle>
            </LiquidGlassCardHeader>
            <LiquidGlassCardContent className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  <Globe className="mr-2 inline h-4 w-4 rtl:ml-2 rtl:mr-0" />
                  {t("admin.systemSettings.language")}
                </label>
                <Select
                  value={editedProfile.preferences?.language || profile.preferences.language}
                  onChange={(e) =>
                    handlePreferenceChange("language", e.target.value as "en" | "ar")
                  }
                  className="w-full sm:w-64"
                >
                  <option value="en">English</option>
                  <option value="ar">العربية</option>
                </Select>
              </div>

              <div className="border-t border-neutral-200 pt-4 dark:border-neutral-800">
                <h4 className="mb-4 font-medium text-neutral-900 dark:text-white">
                  <Bell className="mr-2 inline h-4 w-4 rtl:ml-2 rtl:mr-0" />
                  {t("profile.notificationPreferences")}
                </h4>
                <div className="space-y-3">
                  <label className="flex items-center justify-between rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
                    <span className="text-sm text-neutral-700 dark:text-neutral-300">
                      {t("profile.emailNotifications")}
                    </span>
                    <input
                      type="checkbox"
                      checked={
                        editedProfile.preferences?.emailNotifications ??
                        profile.preferences.emailNotifications
                      }
                      onChange={(e) =>
                        handlePreferenceChange("emailNotifications", e.target.checked)
                      }
                      className="h-5 w-5 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                    />
                  </label>
                  <label className="flex items-center justify-between rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
                    <span className="text-sm text-neutral-700 dark:text-neutral-300">
                      {t("profile.systemNotifications")}
                    </span>
                    <input
                      type="checkbox"
                      checked={
                        editedProfile.preferences?.systemNotifications ??
                        profile.preferences.systemNotifications
                      }
                      onChange={(e) =>
                        handlePreferenceChange("systemNotifications", e.target.checked)
                      }
                      className="h-5 w-5 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                    />
                  </label>
                </div>
              </div>
            </LiquidGlassCardContent>
          </LiquidGlassCard>
        </div>

        {/* Right Column - Statistics */}
        <div className="space-y-6">
          {/* My Requests Stats */}
          <LiquidGlassCard>
            <LiquidGlassCardHeader>
              <LiquidGlassCardTitle>
                {isRTL ? "إحصائيات طلباتي" : "My Request Statistics"}
              </LiquidGlassCardTitle>
            </LiquidGlassCardHeader>
            <LiquidGlassCardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-neutral-400" />
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">
                    {isRTL ? "إجمالي الطلبات" : "Total Requests"}
                  </span>
                </div>
                <span className="text-lg font-semibold text-neutral-900 dark:text-white">
                  {profile.statistics.totalRequests}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-success-500" />
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">
                    {t("dashboard.statistics.approvedRequests")}
                  </span>
                </div>
                <span className="text-lg font-semibold text-success-600">
                  {profile.statistics.approvedRequests}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-warning-500" />
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">
                    {t("dashboard.statistics.pendingRequests")}
                  </span>
                </div>
                <span className="text-lg font-semibold text-warning-600">
                  {profile.statistics.pendingRequests}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-error-500" />
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">
                    {t("dashboard.statistics.rejectedRequests")}
                  </span>
                </div>
                <span className="text-lg font-semibold text-error-600">
                  {profile.statistics.rejectedRequests}
                </span>
              </div>
            </LiquidGlassCardContent>
          </LiquidGlassCard>

          {/* Approval Stats (for approvers) */}
          {(profile.role === "approver" || profile.role === "admin") &&
            profile.statistics.approvalsGiven !== undefined && (
              <LiquidGlassCard>
                <LiquidGlassCardHeader>
                  <LiquidGlassCardTitle>
                    {isRTL ? "إحصائيات الموافقات" : "Approval Statistics"}
                  </LiquidGlassCardTitle>
                </LiquidGlassCardHeader>
                <LiquidGlassCardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-600 dark:text-neutral-400">
                      {isRTL ? "إجمالي الموافقات" : "Total Approvals Given"}
                    </span>
                    <span className="text-lg font-semibold text-neutral-900 dark:text-white">
                      {profile.statistics.approvalsGiven}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-600 dark:text-neutral-400">
                      {isRTL ? "هذا الشهر" : "This Month"}
                    </span>
                    <span className="text-lg font-semibold text-primary-600">
                      {profile.statistics.approvalsThisMonth}
                    </span>
                  </div>
                </LiquidGlassCardContent>
              </LiquidGlassCard>
            )}
        </div>
      </div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-60 w-full" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    </div>
  );
}
