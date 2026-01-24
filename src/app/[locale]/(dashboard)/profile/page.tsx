"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
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
  Calendar,
  Shield,
  Globe,
  Bell,
  Save,
  Award,
  Building,
  Briefcase,
} from "lucide-react";

interface UserProfile {
  id: string;
  nameEn: string;
  nameAr: string | null;
  email: string;
  departmentEn: string | null;
  departmentAr: string | null;
  jobTitleEn: string | null;
  jobTitleAr: string | null;
  employeeCode: string | null;
  scfhsNo: string | null;
  joiningDate: string | null;
  role: string;
  status: string;
  isActive: boolean;
  _count: {
    privilegeRequests: number;
    approvals: number;
  };
}

export default function ProfilePage() {
  const t = useTranslations();
  const locale = useLocale();
  const isRTL = locale === "ar";
  const { data: session, status: sessionStatus } = useSession();

  const [isLoading, setIsLoading] = React.useState(true);
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [editedScfhs, setEditedScfhs] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);
  const [hasChanges, setHasChanges] = React.useState(false);
  const [preferences, setPreferences] = React.useState({
    language: locale as "en" | "ar",
    emailNotifications: true,
    systemNotifications: true,
  });

  // Fetch profile data
  React.useEffect(() => {
    async function fetchProfile() {
      if (!session?.user?.id) return;

      try {
        setIsLoading(true);
        const response = await fetch(`/api/users/${session.user.id}`);

        if (!response.ok) {
          throw new Error("Failed to fetch profile");
        }

        const result = await response.json();
        setProfile(result.data);
        setEditedScfhs(result.data.scfhsNo || "");
      } catch (err) {
        console.error("Error fetching profile:", err);
        setError("Failed to load profile data");
      } finally {
        setIsLoading(false);
      }
    }

    if (session?.user?.id) {
      fetchProfile();
    }
  }, [session?.user?.id]);

  const handleSave = async () => {
    if (!profile) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/users/${profile.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scfhsNo: editedScfhs }),
      });

      if (!response.ok) {
        throw new Error("Failed to update profile");
      }

      setProfile((prev) => prev ? { ...prev, scfhsNo: editedScfhs } : null);
      setHasChanges(false);
    } catch (err) {
      console.error("Error saving profile:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreferenceChange = (
    key: keyof typeof preferences,
    value: string | boolean
  ) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: value,
    }));
    setHasChanges(true);
  };

  const handleScfhsChange = (value: string) => {
    setEditedScfhs(value);
    setHasChanges(value !== (profile?.scfhsNo || ""));
  };

  const getRoleLabel = (role: string) => {
    return t(`admin.userManagement.roles.${role}`);
  };

  const getRoleBadgeVariant = (role: string): "default" | "secondary" | "warning" => {
    if (role === "ADMIN" || role === "MEDICAL_DIRECTOR") return "default";
    if (["HEAD_OF_DEPT", "HEAD_OF_SECTION", "COMMITTEE_MEMBER"].includes(role)) return "warning";
    return "secondary";
  };

  if (sessionStatus === "loading" || isLoading) {
    return <ProfileSkeleton />;
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-neutral-500">{error || "Profile not found"}</p>
      </div>
    );
  }

  const displayName = isRTL && profile.nameAr ? profile.nameAr : profile.nameEn;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            {t("profile.title")}
          </h1>
          <p className="mt-1 text-neutral-500 dark:text-neutral-400">
            {t("profile.description")}
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
                  <Avatar name={profile.nameEn} size="xl" />
                  <Badge variant={getRoleBadgeVariant(profile.role)}>
                    {getRoleLabel(profile.role)}
                  </Badge>
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
                      {profile.employeeCode || "-"}
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Building className="h-4 w-4 text-neutral-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-neutral-500">{t("request.form.personalInfo.department")}</p>
                      <p className="font-medium text-neutral-900 dark:text-white">
                        {isRTL ? profile.departmentAr || profile.departmentEn : profile.departmentEn || "-"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Briefcase className="h-4 w-4 text-neutral-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-neutral-500">{t("request.form.personalInfo.jobTitle")}</p>
                      <p className="font-medium text-neutral-900 dark:text-white">
                        {isRTL ? profile.jobTitleAr || profile.jobTitleEn : profile.jobTitleEn || "-"}
                      </p>
                    </div>
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
                    <Calendar className="h-5 w-5 text-neutral-400" />
                    <div>
                      <p className="text-sm text-neutral-500">{t("profile.joiningDate")}</p>
                      <p className="font-medium">
                        {profile.joiningDate ? formatDate(new Date(profile.joiningDate), locale) : "-"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-lg bg-neutral-50 p-4 dark:bg-neutral-800/50">
                <p className="text-sm text-neutral-500">
                  {t("profile.syncedFromJisr")}
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
                    value={editedScfhs}
                    onChange={(e) => handleScfhsChange(e.target.value)}
                    placeholder="XX-XXXXXX"
                    icon={<Shield className="h-4 w-4" />}
                  />
                  <p className="mt-1 text-xs text-neutral-500">
                    {t("profile.scfhsFormat")}
                  </p>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    {t("profile.accountStatus")}
                  </label>
                  <div className="flex h-10 items-center gap-2">
                    <Badge variant={profile.isActive ? "success" : "error"}>
                      {profile.isActive ? t("admin.userManagement.status.ACTIVE") : t("admin.userManagement.status.INACTIVE")}
                    </Badge>
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
                  value={preferences.language}
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
                      checked={preferences.emailNotifications}
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
                      checked={preferences.systemNotifications}
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
                {t("profile.statistics.myRequests")}
              </LiquidGlassCardTitle>
            </LiquidGlassCardHeader>
            <LiquidGlassCardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-neutral-400" />
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">
                    {t("profile.statistics.totalRequests")}
                  </span>
                </div>
                <span className="text-lg font-semibold text-neutral-900 dark:text-white">
                  {profile._count.privilegeRequests}
                </span>
              </div>
            </LiquidGlassCardContent>
          </LiquidGlassCard>

          {/* Approval Stats (for approvers) */}
          {["ADMIN", "MEDICAL_DIRECTOR", "HEAD_OF_DEPT", "HEAD_OF_SECTION", "COMMITTEE_MEMBER"].includes(profile.role) && (
            <LiquidGlassCard>
              <LiquidGlassCardHeader>
                <LiquidGlassCardTitle>
                  {t("profile.statistics.approvalStats")}
                </LiquidGlassCardTitle>
              </LiquidGlassCardHeader>
              <LiquidGlassCardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">
                    {t("profile.statistics.totalApprovals")}
                  </span>
                  <span className="text-lg font-semibold text-neutral-900 dark:text-white">
                    {profile._count.approvals}
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
