"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { PersonalInfoData } from "@/hooks/usePrivilegeRequest";
import { User, Building2, Briefcase, Mail, IdCard, Hospital } from "lucide-react";

export interface StepPersonalInfoProps {
  data: Partial<PersonalInfoData>;
  onUpdate: (data: Partial<PersonalInfoData>) => void;
  errors?: string | null;
}

// Mock hospital centers - in production, this would come from an API
const HOSPITAL_CENTERS = [
  { id: "main", nameEn: "Main Hospital", nameAr: "المستشفى الرئيسي" },
  { id: "east", nameEn: "East Medical Center", nameAr: "المركز الطبي الشرقي" },
  { id: "west", nameEn: "West Medical Center", nameAr: "المركز الطبي الغربي" },
  { id: "north", nameEn: "North Clinic", nameAr: "عيادة الشمال" },
  { id: "dental", nameEn: "Dental Center", nameAr: "مركز طب الأسنان" },
];

export function StepPersonalInfo({
  data,
  onUpdate,
}: StepPersonalInfoProps) {
  const t = useTranslations("request.form.personalInfo");
  const tValidation = useTranslations("request.validation");
  const locale = useLocale();
  const isRTL = locale === "ar";

  const handleChange = (field: keyof PersonalInfoData, value: string) => {
    onUpdate({ [field]: value });
  };

  // Format SCFHS number as user types (XX-XXXXXXX)
  const handleScfhsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^0-9]/g, "");
    if (value.length > 2) {
      value = value.slice(0, 2) + "-" + value.slice(2, 9);
    }
    handleChange("scfhsNumber", value);
  };

  const scfhsError =
    data.scfhsNumber && !/^\d{2}-\d{7}$/.test(data.scfhsNumber);

  return (
    <div className="space-y-6">
      {/* Description */}
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        {t("description")}
      </p>

      {/* Read-only fields from Jisr */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Full Name (English) */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {t("fullName")}
          </label>
          <Input
            value={data.nameEn || ""}
            readOnly
            disabled
            icon={<User className="h-4 w-4" />}
            className="bg-neutral-50 dark:bg-neutral-800/50"
          />
        </div>

        {/* Full Name (Arabic) */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {t("fullNameAr")}
          </label>
          <Input
            value={data.nameAr || ""}
            readOnly
            disabled
            dir="rtl"
            className="bg-neutral-50 dark:bg-neutral-800/50 text-right"
          />
        </div>

        {/* Employee Code */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {t("employeeCode")}
          </label>
          <Input
            value={data.employeeCode || ""}
            readOnly
            disabled
            icon={<IdCard className="h-4 w-4" />}
            className="bg-neutral-50 dark:bg-neutral-800/50"
          />
        </div>

        {/* Email */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {t("email")}
          </label>
          <Input
            type="email"
            value={data.email || ""}
            readOnly
            disabled
            icon={<Mail className="h-4 w-4" />}
            className="bg-neutral-50 dark:bg-neutral-800/50"
          />
        </div>

        {/* Department */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {t("department")}
          </label>
          <Input
            value={isRTL ? data.departmentAr || data.department || "" : data.department || ""}
            readOnly
            disabled
            icon={<Building2 className="h-4 w-4" />}
            className="bg-neutral-50 dark:bg-neutral-800/50"
          />
        </div>

        {/* Job Title */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {t("jobTitle")}
          </label>
          <Input
            value={isRTL ? data.jobTitleAr || data.jobTitle || "" : data.jobTitle || ""}
            readOnly
            disabled
            icon={<Briefcase className="h-4 w-4" />}
            className="bg-neutral-50 dark:bg-neutral-800/50"
          />
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-neutral-200 dark:border-neutral-700 my-6" />

      {/* Editable Fields */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* SCFHS Number */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {t("scfhsNumber")} <span className="text-red-500">*</span>
          </label>
          <Input
            value={data.scfhsNumber || ""}
            onChange={handleScfhsChange}
            placeholder="XX-XXXXXXX"
            maxLength={10}
            icon={<IdCard className="h-4 w-4" />}
            error={!!scfhsError}
            aria-invalid={!!scfhsError}
            aria-describedby={scfhsError ? "scfhs-error" : undefined}
          />
          {scfhsError && (
            <p id="scfhs-error" className="text-xs text-red-500">
              {tValidation("invalidScfhs")}
            </p>
          )}
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {isRTL
              ? "مثال: 12-3456789"
              : "Format: XX-XXXXXXX (e.g., 12-3456789)"}
          </p>
        </div>

        {/* Hospital Center */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {isRTL ? "مركز المستشفى" : "Hospital Center"}{" "}
            <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Hospital className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 rtl:left-auto rtl:right-3 pointer-events-none z-10" />
            <Select
              value={data.hospitalCenter || ""}
              onChange={(e) => handleChange("hospitalCenter", e.target.value)}
              className="pl-10 rtl:pl-3 rtl:pr-10"
              aria-required="true"
            >
              <option value="">
                {isRTL ? "اختر مركز المستشفى" : "Select Hospital Center"}
              </option>
              {HOSPITAL_CENTERS.map((center) => (
                <option key={center.id} value={center.id}>
                  {isRTL ? center.nameAr : center.nameEn}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 dark:bg-blue-900/20 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-blue-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="text-sm text-blue-700 dark:text-blue-300">
            {isRTL
              ? "المعلومات الشخصية المعروضة أعلاه يتم جلبها تلقائياً من نظام جسر للموارد البشرية ولا يمكن تعديلها هنا. إذا كانت هناك معلومات غير صحيحة، يرجى التواصل مع قسم الموارد البشرية."
              : "The personal information shown above is automatically fetched from the Jisr HR system and cannot be modified here. If any information is incorrect, please contact the HR department."}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StepPersonalInfo;
