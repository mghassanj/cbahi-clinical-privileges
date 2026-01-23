"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import { RadioGroup, RadioCard } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import type { ApplicationTypeData } from "@/hooks/usePrivilegeRequest";
import { FilePlus, RefreshCw, Shield, Star, Sparkles } from "lucide-react";

export interface StepApplicationTypeProps {
  data: Partial<ApplicationTypeData>;
  onUpdate: (data: Partial<ApplicationTypeData>) => void;
  errors?: string | null;
}

const APPLICATION_TYPES = [
  {
    value: "new",
    labelEn: "New Application",
    labelAr: "طلب جديد",
    descriptionEn: "First-time privilege request for new practitioners",
    descriptionAr: "طلب امتياز لأول مرة للممارسين الجدد",
    icon: FilePlus,
  },
  {
    value: "reapplication",
    labelEn: "Reapplication",
    labelAr: "إعادة التقديم",
    descriptionEn: "Reapply for privileges after previous rejection or expiration",
    descriptionAr: "إعادة التقديم للامتيازات بعد الرفض أو انتهاء الصلاحية السابقة",
    icon: RefreshCw,
  },
];

const REQUEST_TYPES = [
  {
    value: "core",
    labelEn: "Core Privileges",
    labelAr: "الامتيازات الأساسية",
    descriptionEn:
      "Essential clinical privileges required for basic practice. These are standard privileges that most practitioners in your specialty would need.",
    descriptionAr:
      "الامتيازات السريرية الأساسية المطلوبة للممارسة الأساسية. هذه امتيازات قياسية يحتاجها معظم الممارسين في تخصصك.",
    icon: Shield,
    color: "primary",
  },
  {
    value: "non-core",
    labelEn: "Non-Core Privileges",
    labelAr: "الامتيازات غير الأساسية",
    descriptionEn:
      "Additional privileges beyond the core set. These may require additional training or certification to be approved.",
    descriptionAr:
      "امتيازات إضافية تتجاوز المجموعة الأساسية. قد تتطلب تدريباً أو شهادات إضافية للموافقة عليها.",
    icon: Star,
    color: "secondary",
  },
  {
    value: "extra",
    labelEn: "Extra Privileges",
    labelAr: "امتيازات إضافية",
    descriptionEn:
      "Special or advanced privileges for specific procedures. These require documented expertise and may need committee review.",
    descriptionAr:
      "امتيازات خاصة أو متقدمة لإجراءات محددة. تتطلب خبرة موثقة وقد تحتاج مراجعة من اللجنة.",
    icon: Sparkles,
    color: "warning",
  },
];

export function StepApplicationType({
  data,
  onUpdate,
  errors,
}: StepApplicationTypeProps) {
  const t = useTranslations("request.form.applicationType");
  const locale = useLocale();
  const isRTL = locale === "ar";

  const handleApplicationTypeChange = (value: string) => {
    onUpdate({
      applicationType: value as "new" | "reapplication",
      // Clear reapplication reason if switching to new application
      reapplicationReason:
        value === "new" ? undefined : data.reapplicationReason,
    });
  };

  const handleRequestTypeChange = (value: string) => {
    onUpdate({ requestType: value as "core" | "non-core" | "extra" });
  };

  const handleReasonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdate({ reapplicationReason: e.target.value });
  };

  return (
    <div className="space-y-8">
      {/* Description */}
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        {t("description")}
      </p>

      {/* Application Type Selection */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
          {isRTL ? "نوع التطبيق" : "Application Type"}
        </h3>
        <RadioGroup
          name="applicationType"
          value={data.applicationType}
          onValueChange={handleApplicationTypeChange}
          className="grid gap-4 md:grid-cols-2"
        >
          {APPLICATION_TYPES.map((type) => {
            const Icon = type.icon;
            return (
              <RadioCard
                key={type.value}
                value={type.value}
                label={isRTL ? type.labelAr : type.labelEn}
                description={isRTL ? type.descriptionAr : type.descriptionEn}
                icon={<Icon className="h-5 w-5" />}
              />
            );
          })}
        </RadioGroup>
      </div>

      {/* Reapplication Reason (shown only when reapplication is selected) */}
      {data.applicationType === "reapplication" && (
        <div className="space-y-3 animate-fade-in">
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {isRTL ? "سبب إعادة التقديم" : "Reason for Reapplication"}{" "}
            <span className="text-red-500">*</span>
          </label>
          <Textarea
            value={data.reapplicationReason || ""}
            onChange={handleReasonChange}
            placeholder={
              isRTL
                ? "يرجى توضيح سبب إعادة التقديم..."
                : "Please explain the reason for your reapplication..."
            }
            rows={4}
            className="resize-none"
            aria-required="true"
          />
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {isRTL
              ? "قدم شرحاً موجزاً لسبب إعادة التقديم للامتيازات السريرية."
              : "Provide a brief explanation of why you are reapplying for clinical privileges."}
          </p>
        </div>
      )}

      {/* Divider */}
      <div className="border-t border-neutral-200 dark:border-neutral-700" />

      {/* Request Type Selection */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
          {isRTL ? "نوع الطلب" : "Request Type"}
        </h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {isRTL
            ? "اختر نوع الامتيازات التي ترغب في التقدم لها"
            : "Select the type of privileges you wish to apply for"}
        </p>
        <RadioGroup
          name="requestType"
          value={data.requestType}
          onValueChange={handleRequestTypeChange}
          className="space-y-4"
        >
          {REQUEST_TYPES.map((type) => {
            const Icon = type.icon;
            const isSelected = data.requestType === type.value;
            return (
              <div
                key={type.value}
                className={cn(
                  "relative rounded-xl border-2 p-5 transition-all duration-200 cursor-pointer",
                  isSelected
                    ? "border-primary-600 bg-primary-50 dark:bg-primary-900/20"
                    : "border-neutral-200 bg-white hover:border-primary-300 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-primary-700"
                )}
                onClick={() => handleRequestTypeChange(type.value)}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
                      isSelected
                        ? "bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-400"
                        : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800"
                    )}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h4
                        className={cn(
                          "text-base font-semibold",
                          "text-neutral-900 dark:text-neutral-100"
                        )}
                      >
                        {isRTL ? type.labelAr : type.labelEn}
                      </h4>
                      <div
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                          isSelected
                            ? "border-primary-600"
                            : "border-neutral-300 dark:border-neutral-600"
                        )}
                      >
                        {isSelected && (
                          <div className="h-2.5 w-2.5 rounded-full bg-primary-600" />
                        )}
                      </div>
                    </div>
                    <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                      {isRTL ? type.descriptionAr : type.descriptionEn}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </RadioGroup>
      </div>

      {/* Info Box for Non-Core and Extra */}
      {(data.requestType === "non-core" || data.requestType === "extra") && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 dark:bg-amber-900/20 dark:border-amber-800 animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-amber-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="text-sm text-amber-700 dark:text-amber-300">
              {isRTL
                ? "ملاحظة: قد تتطلب الامتيازات غير الأساسية والإضافية مستندات إضافية أو مراجعة من اللجنة. تأكد من رفع جميع الشهادات والمؤهلات ذات الصلة في خطوة رفع المستندات."
                : "Note: Non-core and extra privileges may require additional documentation or committee review. Make sure to upload all relevant certifications and qualifications in the document upload step."}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StepApplicationType;
